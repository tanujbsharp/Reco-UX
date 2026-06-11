"""
Seed real PSREF product images for every product in the catalog.

PSREF (psref.lenovo.com) hosts official product renders at a stable convention:

    https://psref.lenovo.com/syspool/Sys/Image/{Series}/{Slug}/{Slug}_CT1_01.png

CT1/CT2 are color variants; _01.._05 are angles. Every (product -> Series/Slug)
pair below was resolved by probing that URL until it returned HTTP 200, so each
mapping is verified against PSREF itself — including the model-code suffixes
that the marketing-style catalog names omit.

For each product the command verifies and writes 3 images (hero = first):
    ProductContent.hero_image_url   = first verified image
    ProductContent.gallery_urls     = [img1, img2, img3]

Idempotent — re-running just re-verifies and rewrites the same URLs. Products
whose images can't be verified are reported and left untouched (placeholders
remain), never silently broken.

Usage:
    python manage.py seed_product_images            # all products
    python manage.py seed_product_images --dry-run  # verify only, write nothing
"""
import requests
from django.core.management.base import BaseCommand

from apps.packets.models import Product, ProductContent

PSREF_IMAGE_BASE = "https://psref.lenovo.com/syspool/Sys/Image"
HEADERS = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"}
IMAGES_PER_PRODUCT = 3
# Try CT1 angles first, then CT2 color variant, until 3 images verify.
IMAGE_SUFFIXES = [
    "_CT1_01.png", "_CT1_02.png", "_CT1_03.png", "_CT1_04.png", "_CT1_05.png",
    "_CT2_01.png", "_CT2_02.png", "_CT2_03.png",
]

# product_id -> (series_dir, psref_slug). Verified by probe on 2026-06-10.
# Notes on non-obvious matches:
#  - 28: "IdeaPad Slim 5 Gen 7 15 AMD" -> IdeaPad 5 15ABA7 (Gen 7 AMD chassis)
#  - 31: "Yoga Slim 7i Carbon" -> Yoga Slim 7 Carbon 13IAP7
#  - 32: "Yoga 7i 2-in-1 Gen 10" -> Yoga 7 2-in-1 14AKP10 (Gen 10 chassis)
#  - 67: "Chromebook Duet 11" -> Chromebook Duet EDU G2 (same 11" Duet chassis;
#        only Duet image set on PSREF)
PSREF_IMAGE_MAP = {
    26: ("Lenovo", "Lenovo_V15_G4_IRU"),
    27: ("IdeaPad", "IdeaPad_Slim_5_14ABR8"),
    28: ("IdeaPad", "IdeaPad_5_15ABA7"),
    29: ("ThinkPad", "ThinkPad_E14_Gen_5_Intel"),
    30: ("ThinkPad", "ThinkPad_E16_Gen_1_AMD"),
    31: ("Yoga", "Yoga_Slim_7_Carbon_13IAP7"),
    32: ("Yoga", "Yoga_7_2_in_1_14AKP10"),
    33: ("LOQ", "LOQ_15IRX9"),
    34: ("Legion", "Legion_Slim_5_16IRH8"),
    35: ("IdeaPad", "IdeaPad_Slim_3_15ABR8"),
    36: ("IdeaPad", "IdeaPad_Flex_5_14ABR8"),
    37: ("ThinkBook", "ThinkBook_14_G7_IML"),
    38: ("ThinkBook", "ThinkBook_16_G7_IML"),
    39: ("ThinkPad", "ThinkPad_T14_Gen_5_Intel"),
    40: ("ThinkPad", "ThinkPad_X1_Carbon_Gen_12"),
    41: ("ThinkPad", "ThinkPad_P14s_Gen_5_AMD"),
    42: ("Yoga", "Yoga_Pro_7_14AHP9"),
    43: ("LOQ", "LOQ_15AHP9"),
    44: ("Legion", "Legion_Pro_5_16IRX9"),
    45: ("IdeaPad", "IdeaPad_Slim_3_14IRH10"),
    46: ("IdeaPad", "IdeaPad_Slim_5_16IMH10"),
    47: ("ThinkBook", "ThinkBook_14_2_in_1_G4_IML"),
    48: ("ThinkPad", "ThinkPad_E16_Gen_4_Intel"),
    49: ("ThinkPad", "ThinkPad_L16_Gen_2_AMD"),
    50: ("ThinkPad", "ThinkPad_T16_Gen_4_Intel"),
    51: ("ThinkPad", "ThinkPad_X13_Gen_6_Intel"),
    52: ("ThinkPad", "ThinkPad_X1_2_in_1_Gen_9"),
    53: ("ThinkPad", "ThinkPad_Z13_Gen_2"),
    54: ("ThinkPad", "ThinkPad_P16s_Gen_3_Intel"),
    55: ("ThinkPad", "ThinkPad_P1_Gen_7"),
    56: ("ThinkPad", "ThinkPad_P16_Gen_2"),
    57: ("Yoga", "Yoga_Slim_7_14ILL10"),
    58: ("Yoga", "Yoga_9_2_in_1_14ILL10"),
    59: ("Yoga", "Yoga_Book_9_14IAH10"),
    60: ("Yoga", "Yoga_Pro_9_16IMH9"),
    61: ("Lenovo", "Lenovo_V14_G4_IRU"),
    62: ("Lenovo", "Lenovo_V17_G4_IRU"),
    63: ("LOQ", "LOQ_15IRX10"),
    64: ("Legion", "Legion_5_15IAX10"),
    65: ("Legion", "Legion_7_16IAX10"),
    66: ("Legion", "Legion_Pro_7_16IAX10H"),
    67: ("Lenovo", "Lenovo_Chromebook_Duet_EDU_G2"),
}


def _url_ok(url):
    try:
        resp = requests.get(url, headers=HEADERS, timeout=12, stream=True)
        ok = resp.status_code == 200
        resp.close()
        return ok
    except requests.RequestException:
        return False


def _verified_images(series, slug, count=IMAGES_PER_PRODUCT):
    """Return up to `count` verified (HTTP 200) image URLs for a slug."""
    images = []
    for suffix in IMAGE_SUFFIXES:
        if len(images) >= count:
            break
        url = f"{PSREF_IMAGE_BASE}/{series}/{slug}/{slug}{suffix}"
        if _url_ok(url):
            images.append(url)
    return images


class Command(BaseCommand):
    help = "Seed verified PSREF product images (hero + 3-image gallery) for all products."

    def add_arguments(self, parser):
        parser.add_argument("--dry-run", action="store_true", help="Verify URLs but write nothing.")

    def handle(self, *args, **options):
        dry = options["dry_run"]
        seeded, skipped = 0, []

        for product in Product.objects.all().order_by("product_id"):
            mapping = PSREF_IMAGE_MAP.get(product.product_id)
            if not mapping:
                skipped.append((product.product_id, product.model, "no mapping"))
                continue

            series, slug = mapping
            images = _verified_images(series, slug)
            if len(images) < IMAGES_PER_PRODUCT:
                skipped.append((product.product_id, product.model, f"only {len(images)} images verified"))
                continue

            if not dry:
                ProductContent.objects.update_or_create(
                    product=product,
                    defaults={"hero_image_url": images[0], "gallery_urls": images},
                )
            seeded += 1
            self.stdout.write(f"  {product.product_id} {product.model}: {len(images)} images ({series}/{slug})")

        self.stdout.write("")
        if skipped:
            for pid, model, why in skipped:
                self.stderr.write(self.style.WARNING(f"  SKIPPED {pid} {model}: {why}"))
        verb = "verified (dry run)" if dry else "seeded"
        self.stdout.write(self.style.SUCCESS(f"{verb} {seeded}/{Product.objects.count()} products, {len(skipped)} skipped"))
