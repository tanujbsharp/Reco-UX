from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal
from typing import Any
from urllib.parse import quote_plus

from django.db import transaction

from apps.packets.models import (
    Accessory,
    BenefitMapping,
    Dimension,
    Feature,
    FeatureValue,
    FinanceScheme,
    Packet,
    Product,
    ProductContent,
    ScoringConfig,
)
from apps.recommendations.models import RecommendationResult
from apps.sessions_app.models import CustomerSession


@dataclass(frozen=True)
class SeedFeature:
    code: str
    name: str
    type: str
    comparable: bool = True
    scoreable: bool = True


def _svg_data_uri(label: str, accent: str, start: str, end: str) -> str:
    del accent
    return (
        "https://placehold.co/1200x800/"
        f"{start.removeprefix('#')}/{end.removeprefix('#')}"
        f"?text={quote_plus(label)}"
    )


FEATURES = [
    SeedFeature("processor", "Processor", "spec"),
    SeedFeature("ram", "Memory", "spec"),
    SeedFeature("storage", "Storage", "spec"),
    SeedFeature("display_size", "Display", "spec"),
    SeedFeature("battery", "Battery", "spec"),
    SeedFeature("weight", "Weight", "spec"),
    SeedFeature("connectivity", "Connectivity", "spec"),
    SeedFeature("build_quality", "Build Quality", "spec"),
    SeedFeature("graphics", "Graphics", "spec"),
    SeedFeature("performance_tier", "Performance Tier", "descriptor", comparable=True, scoreable=False),
    SeedFeature("noise_profile", "Noise Profile", "descriptor", comparable=True, scoreable=False),
]


PRODUCTS: list[dict[str, Any]] = [
    {
        "product_code": "83A1A07CIN",
        "model": "Lenovo V15 Gen 4 IRU",
        "family": "Lenovo V Series",
        "price": Decimal("45000"),
        "url": "https://store.lenovo.com/in/en/nbln-v15-g4-iru-i5-8g-512g-nos-83a1a07cin-2191.html",
        "image": _svg_data_uri("Lenovo V15 Gen 4", "#A9C7FF", "#1E293B", "#7AA2E8"),
        "specs": {
            "processor": ("13th Gen Intel Core i5-13420H", 0.58),
            "ram": ("8 GB DDR4-3200", 0.32),
            "storage": ("512 GB SSD M.2 PCIe Gen4", 0.52),
            "display_size": ('15.6" FHD (1920 x 1080) anti-glare', 0.72),
            "battery": ("38 Wh battery", 0.26),
            "weight": ("1.65 kg", 0.58),
            "connectivity": ("USB-C, USB-A, HDMI, Wi-Fi 6, Bluetooth 5.1", 0.66),
            "build_quality": ("Practical office chassis with privacy shutter", 0.42),
            "graphics": ("Integrated Intel UHD Graphics", 0.2),
            "performance_tier": ("Efficient office performance", None),
            "noise_profile": ("Moderate under sustained load", None),
        },
        "content": {
            "best_for": "Student work, Excel, and value-first office tasks",
            "fit_summary": "This is the value play when the shopper needs dependable day-to-day work, a full keyboard, and enough speed for Office, classes, browser tabs, and admin tasks.",
            "key_highlights": ["13th Gen Core i5", '15.6" display', "Value-oriented"],
            "salesperson_tips": [
                "Use this when the shopper's work is clearly mainstream and there is no need to oversell premium hardware.",
                "The full-size layout and price make it easy to position for spreadsheets, coursework, and back-office use.",
            ],
        },
        "accessories": ["15.6-inch Everyday Topload", "Wireless Compact Mouse"],
        "finance": ["No-cost EMI up to 6 months", "Student offer eligibility varies by store"],
    },
    {
        "product_code": "82LM00JAIN",
        "model": "IdeaPad Slim 5 14 AMD",
        "family": "Lenovo IdeaPad Slim",
        "price": Decimal("58990"),
        "url": "https://store.lenovo.com/in/en/laptops/ideapad/s-series/ideapad-slim-5-14-amd/ideapad-slim-5-35-56cms-amd-ryzen-5-82lm00jain-549.html",
        "image": _svg_data_uri("IdeaPad Slim 5 14", "#B9D7F6", "#22314F", "#8AB4E8"),
        "specs": {
            "processor": ("AMD Ryzen 5", 0.52),
            "ram": ("8 GB soldered DDR4 3200", 0.32),
            "storage": ("512 GB M.2 SSD", 0.52),
            "display_size": ('14" FHD IPS anti-glare, 300 nits', 0.56),
            "battery": ("56.5 Wh, up to 8 hours", 0.54),
            "weight": ("1.4 kg", 0.78),
            "connectivity": ("2x USB-A, USB-C, HDMI 1.4b, card reader", 0.72),
            "build_quality": ("Elegant design with privacy shutter", 0.56),
            "graphics": ("Integrated AMD Radeon Graphics", 0.28),
            "performance_tier": ("Balanced everyday performance", None),
            "noise_profile": ("Quiet for daily productivity", None),
        },
        "content": {
            "best_for": "College, commuting, and flexible everyday use",
            "fit_summary": "A better fit than business-heavy models when someone wants a lighter everyday laptop for study, browsing, streaming, Office work, and the occasional creative task without carrying extra weight.",
            "key_highlights": ["1.4 kg carry", "Privacy shutter", "Good everyday port mix"],
            "salesperson_tips": [
                "Position this for shoppers who want a nicer daily-carry experience than entry business laptops.",
                "It covers study, docs, slides, and browser-heavy work without stepping into premium pricing.",
            ],
        },
        "accessories": ["USB-C 65W Travel Adapter", "14-inch Sleeve"],
        "finance": ["No-cost EMI up to 9 months"],
    },
    {
        "product_code": "82SG003NIN",
        "model": "IdeaPad Slim 5 Gen 7 15 AMD",
        "family": "Lenovo IdeaPad Slim",
        "price": Decimal("70890"),
        "url": "https://store.lenovo.com/in/en/ideapad-slim-5-39-62cms-amd-ryzen-7-82sg003nin-435-1.html",
        "image": _svg_data_uri("IdeaPad Slim 5 15", "#D6E6FA", "#253759", "#A7C2F5"),
        "specs": {
            "processor": ("AMD Ryzen 7 5825U", 0.66),
            "ram": ("16 GB soldered DDR4 3200", 0.62),
            "storage": ("512 GB SSD M.2 PCIe Gen4", 0.52),
            "display_size": ('15.6" FHD IPS anti-glare, 300 nits', 0.76),
            "battery": ("76 Wh, up to 13 hours", 0.82),
            "weight": ("1.8 kg", 0.42),
            "connectivity": ("2x USB-C, 2x USB-A, HDMI, card reader", 0.84),
            "build_quality": ("All-metal chassis with MIL-grade durability", 0.7),
            "graphics": ("Integrated AMD Radeon Graphics", 0.32),
            "performance_tier": ("Large-screen productivity performance", None),
            "noise_profile": ("Quiet / balance / performance modes", None),
        },
        "content": {
            "best_for": "Spreadsheet-heavy work and long unplugged sessions",
            "fit_summary": "This lands well when the shopper needs a bigger screen, stronger multitasking headroom, and genuinely useful battery life without crossing into gaming-class bulk or price.",
            "key_highlights": ["76 Wh battery", '15.6" IPS display', "16 GB RAM"],
            "salesperson_tips": [
                "Use this as the step-up option for shoppers who want a bigger screen but still value everyday practicality.",
                "It is especially easy to justify for split-screen Excel, docs, and browser workflows.",
            ],
        },
        "accessories": ["USB-C Dock Travel Hub", "Bluetooth Silent Mouse"],
        "finance": ["No-cost EMI up to 9 months", "Accidental damage add-on available"],
    },
    {
        "product_code": "21JKS0X800",
        "model": "ThinkPad E14 Gen 5",
        "family": "Lenovo ThinkPad E",
        "price": Decimal("70991"),
        "url": "https://store.lenovo.com/in/en/nb-tp-e14-g5-i5-16g-512g-11s-21jks0x800-435.html",
        "image": _svg_data_uri("ThinkPad E14 Gen 5", "#D2D7E8", "#1B2433", "#6A85C4"),
        "specs": {
            "processor": ("13th Gen Intel Core i5-1335U", 0.62),
            "ram": ("16 GB DDR4-3200", 0.62),
            "storage": ("512 GB SSD M.2 PCIe Gen4", 0.52),
            "display_size": ('14" WUXGA IPS anti-glare, 300 nits', 0.58),
            "battery": ("47 Wh battery", 0.46),
            "weight": ("1.47 kg", 0.74),
            "connectivity": ("USB-C 3.2, USB-A 3.2 and 2.0, Thunderbolt 4, Wi-Fi 6E", 0.86),
            "build_quality": ("ThinkPad durability, security, and MIL-STD design", 0.84),
            "graphics": ("Integrated Intel Iris Xe Graphics", 0.3),
            "performance_tier": ("Business-ready performance", None),
            "noise_profile": ("Quiet in office workloads", None),
        },
        "content": {
            "best_for": "Business buyers who want durability and ports",
            "fit_summary": "Choose this when the conversation points toward a sturdier workhorse: better keyboard feel, stronger connectivity, more business credibility, and dependable daily performance without gaming weight.",
            "key_highlights": ["Thunderbolt 4", "ThinkPad durability", "1.47 kg"],
            "salesperson_tips": [
                "This is the safer recommendation when reliability, keyboard quality, and ports matter more than fashion.",
                "It fits business travel, office productivity, CRM work, and light design or coding better than entry consumer laptops.",
            ],
        },
        "accessories": ["ThinkPad 14-inch Professional Sleeve", "USB-C Universal Dock"],
        "finance": ["Business EMI options available", "Premium Care upgrade available"],
    },
    {
        "product_code": "21JTS01700",
        "model": "ThinkPad E16 Gen 1 AMD",
        "family": "Lenovo ThinkPad E",
        "price": Decimal("54990"),
        "url": "https://store.lenovo.com/in/en/nb-tp-e16-amd-g1-r5-16g-512g-11s-21jts01700-423.html",
        "image": _svg_data_uri("ThinkPad E16 AMD", "#C8D7F8", "#1D263A", "#879ED6"),
        "specs": {
            "processor": ("AMD Ryzen 5 7530U", 0.56),
            "ram": ("16 GB DDR4-3200", 0.62),
            "storage": ("512 GB SSD M.2 PCIe Gen4", 0.52),
            "display_size": ('16" WUXGA IPS anti-glare, 100% sRGB', 0.84),
            "battery": ("47 Wh battery", 0.46),
            "weight": ("1.81 kg", 0.42),
            "connectivity": ("USB-C 3.2, USB-A 3.2, HDMI, Wi-Fi 6", 0.8),
            "build_quality": ("ThinkPad business chassis with number pad", 0.8),
            "graphics": ("Integrated AMD Radeon Graphics", 0.28),
            "performance_tier": ("Big-screen business productivity", None),
            "noise_profile": ("Quiet under office workloads", None),
        },
        "content": {
            "best_for": "Desk-first business work and larger-screen comfort",
            "fit_summary": "This is the right fit when the shopper wants a roomier 16-inch work surface for spreadsheets, research, reporting, and side-by-side windows without moving into creator or gaming pricing.",
            "key_highlights": ['16" 16:10 display', "ThinkPad keyboard", "Value business pricing"],
            "salesperson_tips": [
                "Recommend this when a numpad, larger canvas, and business-grade feel matter more than low carry weight.",
                "It is one of the easiest large-screen recommendations for Excel-heavy or admin-heavy use cases.",
            ],
        },
        "accessories": ["ThinkPad 16-inch Essential Backpack", "Numeric Wireless Keypad"],
        "finance": ["No-cost EMI up to 9 months"],
    },
    {
        "product_code": "82U90080IN",
        "model": "Yoga Slim 7i Carbon",
        "family": "Lenovo Yoga",
        "price": Decimal("131990"),
        "url": "https://store.lenovo.com/in/en/yoga-slim-7i-carbon-12th-gen-33-78cms-intel-i7-moon-white-82u90080in-12004-1.html",
        "image": _svg_data_uri("Yoga Slim 7i Carbon", "#E4D9FF", "#28365C", "#B8C7F7"),
        "specs": {
            "processor": ("12th Gen Intel Core i7-1260P", 0.74),
            "ram": ("16 GB LPDDR5 4800", 0.62),
            "storage": ("1 TB SSD PCIe Gen4", 0.78),
            "display_size": ('13.3" 2.5K 90Hz touch, 100% sRGB', 0.46),
            "battery": ("50 Wh, up to 10 hours", 0.56),
            "weight": ("1.0 kg", 1.0),
            "connectivity": ("USB-C 3.2 Gen 2, Thunderbolt 4 / USB4", 0.72),
            "build_quality": ("Carbon-fiber chassis with 3-year onsite warranty", 0.9),
            "graphics": ("Integrated Intel Iris Xe Graphics", 0.3),
            "performance_tier": ("Premium ultraportable performance", None),
            "noise_profile": ("Quiet premium mobility tuning", None),
        },
        "content": {
            "best_for": "Premium portability and frequent carry",
            "fit_summary": "This is the portability-first premium choice: very light, sharp display, solid battery, and enough headroom for serious productivity without carrying a heavier machine every day.",
            "key_highlights": ["1.0 kg carry", "2.5K 90Hz display", "1 TB SSD"],
            "salesperson_tips": [
                "This is the clearest answer when the user keeps mentioning commute, campus, flights, or daily carry comfort.",
                "It should beat larger premium laptops whenever mobility is a core requirement rather than a nice-to-have.",
            ],
        },
        "accessories": ["Yoga 13-inch Sleeve", "USB-C Multiport Adapter"],
        "finance": ["Premium EMI up to 12 months", "Exchange bonus may apply"],
    },
    {
        "product_code": "83JQ000NIN",
        "model": "Yoga 7i 2-in-1 Gen 10",
        "family": "Lenovo Yoga",
        "price": Decimal("136490"),
        "url": "https://store.lenovo.com/in/en/nb-yg-7-2-in-1-14ill10-u7-32g-1t-11s-83jq000nin-1113.html",
        "image": _svg_data_uri("Yoga 7i 2-in-1", "#F3D7E6", "#2D3355", "#DDB4D2"),
        "specs": {
            "processor": ("Intel Core Ultra 7 258V", 0.88),
            "ram": ("32 GB LPDDR5X-8533", 0.96),
            "storage": ("1 TB SSD PCIe Gen4", 0.78),
            "display_size": ('14" 2.8K OLED touch, 120Hz, 100% DCI-P3', 0.62),
            "battery": ("70 Wh battery", 0.8),
            "weight": ("1.4 kg", 0.78),
            "connectivity": ("USB-C, premium webcam, pen support, AI features", 0.8),
            "build_quality": ("Premium convertible build with OLED glass display", 0.92),
            "graphics": ("Integrated Intel Arc Graphics 140V", 0.46),
            "performance_tier": ("Premium creative AI convertible", None),
            "noise_profile": ("Cooler and quieter than typical creator rigs", None),
        },
        "content": {
            "best_for": "Premium creative work, presenting, and pen workflows",
            "fit_summary": "This is the premium do-more machine when the shopper wants one device for strong daily productivity, better display quality, sketching or presenting flexibility, and future-facing AI features.",
            "key_highlights": ["32 GB RAM", "2.8K OLED touch", "Convertible with pen"],
            "salesperson_tips": [
                "Use this when the shopper values display quality, pen input, presentation flexibility, or wants a single premium machine for mixed work.",
                "It is the strongest non-gaming recommendation for premium multitasking and creative use without a bulky dGPU system.",
            ],
        },
        "accessories": ["Yoga Sleeve", "Yoga Pen bundle", "USB-C 65W GaN charger"],
        "finance": ["No-cost EMI up to 12 months", "Premium Care included on select units"],
    },
    {
        "product_code": "83DV00XDIN",
        "model": "Lenovo LOQ 15IRX9",
        "family": "Lenovo LOQ",
        "price": Decimal("88000"),
        "url": "https://store.lenovo.com/in/en/nb-loq-15irx9-i5-24g-512g-11s-83dv00xdin-539.html",
        "image": _svg_data_uri("Lenovo LOQ 15", "#F0D7CE", "#2B2432", "#E2A48D"),
        "specs": {
            "processor": ("13th Gen Intel Core i5-13450HX", 0.84),
            "ram": ("24 GB DDR5-4800", 0.82),
            "storage": ("512 GB SSD PCIe Gen4", 0.52),
            "display_size": ('15.6" FHD IPS, 144Hz, 100% sRGB', 0.76),
            "battery": ("60 Wh battery", 0.62),
            "weight": ("2.45 kg", 0.1),
            "connectivity": ("USB-C charging, HDMI, gaming IO, fast wireless", 0.86),
            "build_quality": ("Gaming chassis with hyper chamber thermals", 0.74),
            "graphics": ("NVIDIA GeForce RTX 4050 Laptop GPU 6 GB", 0.88),
            "performance_tier": ("Mainstream gaming and creator performance", None),
            "noise_profile": ("Audible under gaming load, calmer in balance mode", None),
        },
        "content": {
            "best_for": "Gaming, 3D work, and GPU-heavy student/creator use",
            "fit_summary": "This is the practical gaming recommendation when the use case clearly needs real GPU muscle for modern games, 3D, rendering, heavier Adobe workflows, or anything that integrated graphics will bottleneck.",
            "key_highlights": ["RTX 4050", "24 GB DDR5", "144Hz display"],
            "salesperson_tips": [
                "Use this when the shopper mentions gaming, Unreal, Blender, Premiere, or heavier rendering.",
                "It should not outrank lighter productivity systems unless the conversation clearly points toward GPU-dependent work.",
            ],
        },
        "accessories": ["Lenovo Legion M300s Mouse", "Gaming Backpack", "Cooling Pad"],
        "finance": ["No-cost EMI up to 12 months", "Accidental damage protection included on select offers"],
    },
    {
        "product_code": "82YA00DXIN",
        "model": "Legion Slim 5i",
        "family": "Lenovo Legion",
        "price": Decimal("139990"),
        "url": "https://store.lenovo.com/in/en/legion-slim-5i-13th-gen-40-64cms-intel-i7-storm-grey-82ya00dxin-1115-1.html",
        "image": _svg_data_uri("Legion Slim 5i", "#E8D1F0", "#221A2E", "#BC92D0"),
        "specs": {
            "processor": ("13th Gen Intel Core i7-13620H", 0.9),
            "ram": ("16 GB DDR5-5200", 0.62),
            "storage": ("1 TB SSD PCIe Gen4", 0.78),
            "display_size": ('16" WQXGA IPS, 165Hz, 100% sRGB, G-Sync', 0.88),
            "battery": ("80 Wh battery", 0.86),
            "weight": ("2.4 kg", 0.14),
            "connectivity": ("2x USB-C, 2x USB-A, HDMI 2.1, Ethernet, card reader", 0.94),
            "build_quality": ("Slim premium gaming chassis with ColdFront 5.0", 0.88),
            "graphics": ("NVIDIA GeForce RTX 4060 8 GB", 0.96),
            "performance_tier": ("High-end gaming and creator performance", None),
            "noise_profile": ("Gaming-class acoustics with strong cooling", None),
        },
        "content": {
            "best_for": "High-end gaming, heavy editing, and creator workloads",
            "fit_summary": "Recommend this only when the answers justify it: gaming, 3D, serious video work, heavier codebases, or a shopper explicitly asking for long-term GPU headroom and a better display.",
            "key_highlights": ["RTX 4060", '16" WQXGA 165Hz', "1 TB SSD"],
            "salesperson_tips": [
                "This is the aspirational power option, but it should win only when the use case genuinely needs the extra headroom.",
                "If the shopper is mostly doing Office, study, or browser work, a lighter lower-tier laptop is usually the better fit.",
            ],
        },
        "accessories": ["Legion Gaming Mouse", "Legion 16-inch Armored Backpack", "RGB Headset"],
        "finance": ["No-cost EMI up to 12 months", "Exchange bonus may apply in store"],
    },
]


BENEFIT_MAPPINGS = [
    ("student", "price", 0.3),
    ("student", "everyday_fit", 0.25),
    ("excel", "large_display", 0.3),
    ("excel", "value_for_money", 0.2),
    ("travel", "portability", 0.35),
    ("travel", "weight", 0.25),
    ("battery", "battery", 0.35),
    ("coding", "processor", 0.3),
    ("coding", "ram", 0.25),
    ("design", "creative_headroom", 0.35),
    ("editing", "graphics", 0.4),
    ("gaming", "graphics", 0.6),
    ("gaming", "processor", 0.35),
    ("gaming", "display_size", 0.2),
    ("value", "price", 0.35),
    ("value", "value_for_money", 0.35),
    ("premium", "build_quality", 0.25),
]


DIMENSIONS = [
    (
        "Everyday workload",
        1,
        [
            "Is this mainly for study, documents, browsing, and Office work?",
            "Do you need heavier creative or gaming performance?",
        ],
    ),
    (
        "Mobility",
        2,
        [
            "Will you carry this every day or mostly use it at a desk?",
            "Does low weight matter more than a larger screen?",
        ],
    ),
    (
        "Performance headroom",
        3,
        [
            "How much future headroom do you want for coding, creative work, or gaming?",
            "Would integrated graphics be enough, or do you need a real GPU?",
        ],
    ),
]


DEFAULT_WEIGHTS = {
    "processor": 0.66,
    "ram": 0.56,
    "storage": 0.52,
    "display_size": 0.52,
    "battery": 0.66,
    "weight": 0.7,
    "connectivity": 0.56,
    "build_quality": 0.42,
    "graphics": 0.28,
    "price": 0.64,
    "compactness": 0.24,
    "large_display": 0.28,
    "portability": 0.58,
    "value_for_money": 0.62,
    "everyday_fit": 0.6,
    "creative_headroom": 0.26,
    "right_sized_performance": 0.22,
}


def _gallery(image: str) -> list[str]:
    return [image, image, image]


@transaction.atomic
def replace_lenovo_catalog(cmid: int = 1, packet_id: int = 1) -> dict[str, Any]:
    packet, _ = Packet.objects.update_or_create(
        packet_id=packet_id,
        defaults={
            "cmid": cmid,
            "category": "Laptops",
            "brand": "Lenovo",
            "launch_status": "active",
        },
    )

    RecommendationResult.objects.all().delete()

    packet.products.all().delete()
    packet.features.all().delete()
    packet.benefit_mappings.all().delete()
    packet.dimensions.all().delete()
    packet.scoring_configs.all().delete()

    feature_map: dict[str, Feature] = {}
    for feature in FEATURES:
        feature_map[feature.code] = Feature.objects.create(
            packet=packet,
            feature_code=feature.code,
            feature_name=feature.name,
            feature_type=feature.type,
            is_comparable=feature.comparable,
            is_scoreable=feature.scoreable,
        )

    created_products: list[Product] = []
    for entry in PRODUCTS:
        product = Product.objects.create(
            packet=packet,
            product_code=entry["product_code"],
            model=entry["model"],
            family=entry["family"],
            price=entry["price"],
            product_url=entry["url"],
            crawl_status="seeded",
        )
        created_products.append(product)

        for feature_code, payload in entry["specs"].items():
            value, normalized = payload
            FeatureValue.objects.create(
                product=product,
                feature=feature_map[feature_code],
                value=value,
                normalized_value=normalized,
            )

        ProductContent.objects.create(
            product=product,
            hero_image_url=entry["image"],
            gallery_urls=_gallery(entry["image"]),
            fit_summary=entry["content"]["fit_summary"],
            key_highlights=entry["content"]["key_highlights"],
            best_for=entry["content"]["best_for"],
            salesperson_tips=entry["content"]["salesperson_tips"],
        )

        for accessory in entry["accessories"]:
            Accessory.objects.create(product=product, accessory_name=accessory)

        for scheme in entry["finance"]:
            FinanceScheme.objects.create(product=product, scheme_name=scheme)

    for benefit_name, feature_code, weight_impact in BENEFIT_MAPPINGS:
        BenefitMapping.objects.create(
            packet=packet,
            benefit_name=benefit_name,
            feature_code=feature_code,
            weight_impact=weight_impact,
        )

    for dimension_name, priority, seed_questions in DIMENSIONS:
        Dimension.objects.create(
            packet=packet,
            dimension_name=dimension_name,
            priority=priority,
            seed_questions=seed_questions,
        )

    ScoringConfig.objects.create(
        packet=packet,
        default_weights=DEFAULT_WEIGHTS,
        hard_filters={},
        stopping_rules={"min_questions": 5, "max_questions": 7},
    )

    CustomerSession.objects.filter(cmid=cmid, packet_id__isnull=True).update(packet_id=packet.packet_id)

    return {
        "packet_id": packet.packet_id,
        "cmid": cmid,
        "products_created": len(created_products),
        "product_codes": [product.product_code for product in created_products],
        "features_created": len(feature_map),
    }
