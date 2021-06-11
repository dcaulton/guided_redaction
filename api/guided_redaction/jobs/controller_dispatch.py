from guided_redaction.jobs.models import Job
from guided_redaction.analyze import tasks as analyze_tasks
from guided_redaction.parse import tasks as parse_tasks
from guided_redaction.redact import tasks as redact_tasks
from guided_redaction.files import tasks as files_tasks
from guided_redaction.pipelines import tasks as pipelines_tasks
from guided_redaction.job_run_summaries import tasks as jrs_tasks


class JobDispatchController:
    def dispatch_job_and_unfinished_children(self, job):
        children = Job.objects.filter(parent=job)
        for child_to_restart in children:
            if Job.objects.filter(parent=child_to_restart).exists():
                grandchildren = Job.objects.filter(parent=child_to_restart)
                for grandchild in grandchildren:
                    if grandchild.status != 'success':
                        grandchild.re_initialize_as_running()
                        grandchild.save()
                        log.info(
                            're-displatching grandchild job {}'.format(grandchild)
                        )
                        self.dispatch_job(grandchild)
            else:
                if child_to_restart.status != 'success':
                    log.info('re-displatching child job {}'.format(child_to_restart))
                    child_to_restart.re_initialize_as_running()
                    child_to_restart.save()
                    self.dispatch_job(child_to_restart)
        self.dispatch_job(job)

    def dispatch_job(self, job):
        job_uuid = job.id
        if job.app == 'analyze' and job.operation == 'template_threaded':
            analyze_tasks.template_threaded.delay(job_uuid)
        if job.app == 'analyze' and job.operation == 'scan_template_multi':
            analyze_tasks.scan_template_multi.delay(job_uuid)
        if job.app == 'analyze' and job.operation == 'filter':
            analyze_tasks.filter.delay(job_uuid)
        if job.app == 'analyze' and job.operation == 'ocr_threaded':
            analyze_tasks.ocr_threaded.delay(job_uuid)
        if job.app == 'analyze' and job.operation == 'scan_ocr':
            analyze_tasks.scan_ocr.delay(job_uuid)
        if job.app == 'analyze' and job.operation == 'get_timestamp':
            analyze_tasks.get_timestamp.delay(job_uuid)
        if job.app == 'analyze' and job.operation == 'get_timestamp_threaded':
            analyze_tasks.get_timestamp_threaded.delay(job_uuid)
        if job.app == 'analyze' and job.operation == 'template_match_chart':
            analyze_tasks.template_match_chart.delay(job_uuid)
        if job.app == 'analyze' and job.operation == 'ocr_match_chart':
            analyze_tasks.ocr_match_chart.delay(job_uuid)
        if job.app == 'analyze' and job.operation == 'selection_grower_chart':
            analyze_tasks.selection_grower_chart.delay(job_uuid)
        if job.app == 'analyze' and job.operation == 'selected_area_threaded':
            analyze_tasks.selected_area_threaded.delay(job_uuid)
        if job.app == 'analyze' and job.operation == 'mesh_match_threaded':
            analyze_tasks.mesh_match_threaded.delay(job_uuid)
        if job.app == 'analyze' and job.operation == 'selection_grower_threaded':
            analyze_tasks.selection_grower_threaded.delay(job_uuid)
        if job.app == 'analyze' and job.operation == 'manual_compile_data_sifter':
            analyze_tasks.manual_compile_data_sifter.delay(job_uuid)
        if job.app == 'analyze' and job.operation == 'data_sifter_threaded':
            analyze_tasks.data_sifter_threaded.delay(job_uuid)
        if job.app == 'analyze' and job.operation == 'focus_finder_threaded':
            analyze_tasks.focus_finder_threaded.delay(job_uuid)
        if job.app == 'analyze' and job.operation == 'intersect':
            analyze_tasks.intersect.delay(job_uuid)
        if job.app == 'analyze' and job.operation == 't1_filter_threaded':
            analyze_tasks.t1_filter.delay(job_uuid)
        if job.app == 'parse' and job.operation == 'split_and_hash_threaded':
            parse_tasks.split_and_hash_threaded.delay(job_uuid)
        if job.app == 'parse' and job.operation == 'split_threaded':
            parse_tasks.split_threaded.delay(job_uuid)
        if job.app == 'parse' and job.operation == 'hash_movie':
            parse_tasks.hash_frames.delay(job_uuid)
        if job.app == 'parse' and job.operation == 'copy_movie':
            parse_tasks.copy_movie.delay(job_uuid)
        if job.app == 'parse' and job.operation == 'change_movie_resolution':
            parse_tasks.change_movie_resolution.delay(job_uuid)
        if job.app == 'parse' and job.operation == 'rebase_movies':
            parse_tasks.rebase_movies.delay(job_uuid)
        if job.app == 'parse' and job.operation == 'render_subsequence':
            parse_tasks.render_subsequence.delay(job_uuid)
        if job.app == 'redact' and job.operation == 'redact':
            redact_tasks.redact_threaded.delay(job_uuid)
        if job.app == 'redact' and job.operation == 'redact_t1':
            redact_tasks.redact_t1_threaded.delay(job_uuid)
        if job.app == 'redact' and job.operation == 'redact_single':
            redact_tasks.redact_single.delay(job_uuid)
        if job.app == 'redact' and job.operation == 'illustrate':
            redact_tasks.illustrate.delay(job_uuid)
        if job.app == 'parse' and job.operation == 'zip_movie':
            parse_tasks.zip_movie.delay(job_uuid)
        if job.app == 'parse' and job.operation == 'zip_movie_threaded':
            parse_tasks.zip_movie_threaded.delay(job_uuid)
        if job.app == 'files' and job.operation == 'get_secure_file':
            files_tasks.get_secure_file.delay(job_uuid)
        if job.app == 'files' and job.operation == 'save_movie_metadata':
            files_tasks.save_movie_metadata.delay(job_uuid)
        if job.app == 'files' and job.operation == 'load_movie_metadata':
            files_tasks.load_movie_metadata.delay(job_uuid)
        if job.app == 'files' and job.operation == 'unzip_archive':
            files_tasks.unzip_archive.delay(job_uuid)
        if job.app == 'pipeline' and job.operation == 't1_sum':
            pipelines_tasks.t1_sum.delay(job_uuid)
        if job.app == 'pipeline' and job.operation == 't1_diff':
            pipelines_tasks.t1_diff.delay(job_uuid)
        if job.app == 'pipeline' and job.operation == 'noop':
            pipelines_tasks.noop.delay(job_uuid)
        if job.app == 'job_run_summaries' and job.operation == 'create_manual_jrs':
            jrs_tasks.create_manual_jrs.delay(job_uuid)
        if job.app == 'job_run_summaries' and job.operation == 'create_automatic_jrs':
            jrs_tasks.create_automatic_jrs.delay(job_uuid)

