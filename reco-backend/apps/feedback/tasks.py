"""
Scheduled tasks for Bsharp Reco Feedback system.

Uses Django Q for scheduling nightly batch jobs.
"""
import logging

from apps.feedback.pattern_analyzer import analyze_patterns

logger = logging.getLogger(__name__)


def run_nightly_pattern_analysis():
    """
    Django Q task: Run the nightly feedback pattern analysis.

    Schedule this via Django Q admin or management command:

        from django_q.tasks import schedule
        from django_q.models import Schedule

        schedule(
            'apps.feedback.tasks.run_nightly_pattern_analysis',
            schedule_type=Schedule.CRON,
            cron='0 2 * * *',  # 2:00 AM daily
            name='nightly-feedback-pattern-analysis',
        )
    """
    logger.info('Nightly feedback pattern analysis task starting...')

    try:
        summary = analyze_patterns()
        logger.info('Nightly pattern analysis completed: %s', summary)
        return summary
    except Exception as e:
        logger.exception('Nightly pattern analysis failed: %s', e)
        raise
