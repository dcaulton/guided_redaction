import uuid
from django.db import models
from guided_redaction.utils.classes.FileWriter import FileWriter


class JobRunSummary(models.Model):
    created_on = models.DateTimeField(auto_now_add=True)
    updated_on = models.DateTimeField(auto_now=True)
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    job = models.ForeignKey('jobs.Job', on_delete=models.CASCADE)
    job_eval_objective = models.ForeignKey('job_eval_objectives.JobEvalObjective', on_delete=models.CASCADE)
    summary_type = models.CharField(max_length=36)
    score = models.FloatField(default=0)
    content = models.TextField(null=True)
    content_data_path = models.CharField(max_length=255, null=True)
    content_data_checksum = models.CharField(max_length=255, null=True)

    MAX_DB_PAYLOAD_SIZE = 1000000

    def __str__(self):
        self_hash = self.as_hash()
        self_hash['content'] = "{} bytes".format(len(self_hash['content']))
        return self_hash.__str__()

    def as_hash(self):
        disp_hash = {
            'id': str(self.id),
            'job_id': str(self.job.id),
            'job_eval_objective_id': str(self.job_eval_objective.id),
            'updated_on': str(self.updated_on),
            'summary_type': self.summary_type,
            'score': str(self.score),
            'content': self.content,
        }
        return disp_hash

    def save(self, *args, **kwargs):
        if self.content and len(self.content) > self.MAX_DB_PAYLOAD_SIZE:
            checksum = hashlib.md5(self.content.encode('utf-8')).hexdigest()
            if self.content_data_checksum != checksum:
                self.content_data_checksum = checksum
                directory = self.get_current_directory()
                if self.content_data_path:
                    old_content_path = self.content_data_path
                    old_files_to_clear_out_exist = True
                self.content_data_path = \
                    self.save_data_to_disk(self.content, directory)
                self.content = '{}'

        if old_files_to_clear_out_exist:
            self.delete_data_from_disk()
        super(JobRunSummary, self).save(*args, **kwargs)

    def delete(self):
        self.delete_data_from_disk()
        super(JobRunSummary, self).delete()

    @classmethod
    def from_db(cls, db, field_names, values):
        instance = cls(*values)
        instance.get_data_from_disk()
        return instance

    # TODO develop code to share between jobs and this model for serializing payloads to/from disk
    def save_data_to_disk(self, data, directory):
        fw = FileWriter(
            working_dir=settings.REDACT_FILE_STORAGE_DIR,
            base_url=settings.REDACT_FILE_BASE_URL,
            image_request_verify_headers=settings.REDACT_IMAGE_REQUEST_VERIFY_HEADERS,
        )
        if not directory:
            directory = str(uuid.uuid4())
            fw.create_unique_directory(directory)
        filename_uuid = str(uuid.uuid4())
        file_name = 'jrs_' + filename_uuid + '_data.json'
        outfilepath = fw.build_file_fullpath_for_uuid_and_filename(directory, file_name)
        fw.write_text_data_to_filepath(data, outfilepath)

        return outfilepath

    def get_data_from_disk(self):
        if self.content_data_path:
            fw = FileWriter(
                working_dir=settings.REDACT_FILE_STORAGE_DIR,
                base_url=settings.REDACT_FILE_BASE_URL,
                image_request_verify_headers=settings.REDACT_IMAGE_REQUEST_VERIFY_HEADERS,
            )
            self.content = fw.get_text_data_from_filepath(self.content_data_path)

    def get_current_directory(self):
        if self.content_data_path:
            return self.content_data_path.split('/')[-2]

    def delete_data_from_disk(self):
        if content_data_path:
            fw = FileWriter(
                working_dir=settings.REDACT_FILE_STORAGE_DIR,
                base_url=settings.REDACT_FILE_BASE_URL,
                image_request_verify_headers=settings.REDACT_IMAGE_REQUEST_VERIFY_HEADERS,
            )
            fw.delete_item_at_filepath(content_data_path)

