"""
Email service for sharing product recommendations via Amazon SES.

Builds a formatted email with recommendation details (match percentages,
highlights, product names) and sends it through the SES client.

Used by: leads.views.share_email
"""
import logging

from apps.common.ses_client import ses_client
from apps.recommendations.models import RecommendationResult

logger = logging.getLogger(__name__)

DEFAULT_BRAND_NAME = 'Bsharp Reco'


def _build_product_row(reco, product_detail=None):
    """
    Build an HTML table row for a single recommendation.

    Args:
        reco: RecommendationResult instance.
        product_detail: Optional product detail dict (from packets).

    Returns:
        str: HTML table row.
    """
    product_name = ''
    if product_detail:
        product_name = product_detail.get('product_name', f'Product {reco.product_id}')
    else:
        product_name = f'Product {reco.product_id}'

    highlights = ''
    if product_detail and product_detail.get('key_highlights'):
        highlight_items = ''.join(
            f'<li>{h}</li>' for h in product_detail['key_highlights'][:3]
        )
        highlights = f'<ul style="margin:4px 0;padding-left:16px;">{highlight_items}</ul>'

    return f"""
    <tr style="border-bottom:1px solid #eee;">
        <td style="padding:12px 8px;font-weight:bold;">#{reco.rank}</td>
        <td style="padding:12px 8px;">{product_name}</td>
        <td style="padding:12px 8px;text-align:center;font-weight:bold;color:#2563eb;">
            {reco.match_percentage}%
        </td>
        <td style="padding:12px 8px;">{highlights}</td>
    </tr>
    """


def _build_email_html(session, recommendations, brand_name=None):
    """
    Build the full HTML email body for recommendation sharing.

    Args:
        session: CustomerSession instance.
        recommendations: QuerySet of RecommendationResult.
        brand_name: Optional brand name override.

    Returns:
        str: Complete HTML email body.
    """
    brand = brand_name or DEFAULT_BRAND_NAME

    # Try to load product details for richer emails
    product_details = {}
    try:
        from apps.packets.models import Product
        for reco in recommendations:
            try:
                product = Product.objects.get(pk=reco.product_id)
                product_details[reco.product_id] = {
                    'product_name': getattr(product, 'product_name', ''),
                    'key_highlights': getattr(product, 'key_highlights', []),
                    'brand': getattr(product, 'brand', ''),
                }
            except Product.DoesNotExist:
                pass
    except (ImportError, Exception):
        pass

    product_rows = ''.join(
        _build_product_row(reco, product_details.get(reco.product_id))
        for reco in recommendations
    )

    html = f"""
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family:Arial,sans-serif;color:#333;max-width:600px;margin:0 auto;">
        <div style="background:#2563eb;color:white;padding:20px;text-align:center;">
            <h1 style="margin:0;font-size:22px;">Your Product Recommendations</h1>
            <p style="margin:4px 0 0;opacity:0.9;">from {brand}</p>
        </div>

        <div style="padding:20px;">
            <p>Based on your preferences, here are our top recommendations for you:</p>

            <table style="width:100%;border-collapse:collapse;margin:16px 0;">
                <thead>
                    <tr style="background:#f8fafc;border-bottom:2px solid #e2e8f0;">
                        <th style="padding:8px;text-align:left;">Rank</th>
                        <th style="padding:8px;text-align:left;">Product</th>
                        <th style="padding:8px;text-align:center;">Match</th>
                        <th style="padding:8px;text-align:left;">Highlights</th>
                    </tr>
                </thead>
                <tbody>
                    {product_rows}
                </tbody>
            </table>

            <p style="color:#666;font-size:13px;margin-top:24px;">
                Visit your nearest store to try these products in person.
                Our staff will be happy to assist you.
            </p>
        </div>

        <div style="background:#f8fafc;padding:12px 20px;text-align:center;font-size:12px;color:#999;">
            Session #{session.session_id} &middot; Powered by {brand}
        </div>
    </body>
    </html>
    """

    return html


def _build_email_text(session, recommendations):
    """
    Build a plain-text fallback email body.

    Args:
        session: CustomerSession instance.
        recommendations: QuerySet of RecommendationResult.

    Returns:
        str: Plain-text email body.
    """
    lines = ["Your Product Recommendations", "=" * 30, ""]

    for reco in recommendations:
        lines.append(
            f"#{reco.rank}: Product {reco.product_id} "
            f"— {reco.match_percentage}% match"
        )

    lines.append("")
    lines.append("Visit your nearest store to try these products.")
    lines.append(f"Session #{session.session_id}")

    return "\n".join(lines)


def send_recommendation_email(session, recipient_email, brand_name=None):
    """
    Send a recommendation email to the customer.

    Args:
        session: CustomerSession instance.
        recipient_email: Recipient email address.
        brand_name: Optional brand name override.

    Returns:
        str: SES message ID.

    Raises:
        Exception: If SES send fails.
    """
    brand = brand_name or DEFAULT_BRAND_NAME

    recommendations = (
        RecommendationResult.objects.filter(session=session)
        .order_by('rank')[:3]
    )

    if not recommendations:
        raise ValueError(f'No recommendations found for session {session.session_id}')

    subject = f'Your product recommendations from {brand}'
    body_html = _build_email_html(session, recommendations, brand_name=brand)
    body_text = _build_email_text(session, recommendations)

    response = ses_client.send_email(
        to_addresses=recipient_email,
        subject=subject,
        body_html=body_html,
        body_text=body_text,
    )

    message_id = response.get('MessageId', '')
    logger.info(
        'Recommendation email sent for session %s to %s — MessageId: %s',
        session.session_id, recipient_email, message_id,
    )

    return message_id
