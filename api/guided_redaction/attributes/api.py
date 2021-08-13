from rest_framework.response import Response
from base import viewsets
from guided_redaction.attributes.models import Attribute
from guided_redaction.pipelines.models import Pipeline
from guided_redaction.jobs.models import Job
from guided_redaction.workbooks.models import Workbook
from guided_redaction.scanners.models import Scanner

class AttributesViewSet(viewsets.ViewSet):
    def list(self, request):
        attributes_list = []
        if request.GET.get('name'):
            attributes = Attribute.objects.filter(name=request.GET.get('name'))
        else:
            attributes = Attribute.objects.all()
        for attribute in attributes:
            attributes_list.append(
                {
                    'id': attribute.id,
                    'name': attribute.name,
                    'value': attribute.value,
                    'created_on': attribute.created_on,
                    'updated_on': attribute.updated_on,
                    'scanner_id': attribute.scanner.id if attribute.scanner else '',
                    'job_id': attribute.job.id if attribute.job else '',
                    'job_run_summary_id': attribute.job_run_summary.id if attribute.job_run_summary else '',
                    'job_eval_objective_id': attribute.job_eval_objective.id if attribute.job_eval_objective else '',
                    'workbook_id': attribute.workbook.id if attribute.workbook_id else '',
                    'pipeline_id': attribute.pipeline.id if attribute.pipeline else '',
                }
            )

        return Response({"attributes": attributes_list})

    def retrieve(self, request, pk):
        attribute = Attribute.objects.get(pk=pk)
        a_data = {
            'id': attribute.id,
            'name': attribute.name,
            'value': attribute.value,
            'created_on': attribute.created_on,
            'updated_on': attribute.updated_on,
            'scanner_id': attribute.scanner.id if attribute.scanner else '',
            'job_id': attribute.job.id if attribute.job else '',
            'job_run_summary_id': attribute.job_run_summary.id if attribute.job_run_summary else '',
            'job_eval_objective_id': attribute.job_eval_objective.id if attribute.job_eval_objective else '',
            'workbook_id': attribute.workbook.id if attribute.workbook_id else '',
            'pipeline_id': attribute.pipeline.id if attribute.pipeline else '',
        }
        return Response({"attribute": a_data})

    def create(self, request):
        attribute = Attribute(
            name=request.data.get('name'),
            value=request.data.get('value'),
            description=request.data.get('description'),
            content=json.dumps(request.data.get('content')),
        )
        if request.data.get('workbook_id'):
            workbook = Workbook.objects.get(request.data.get('workbook_id'))
            attribute.workbook = workbook
        if request.data.get('scanner_id'):
            scanner = Scanner.objects.get(request.data.get('scanner_id'))
            attribute.scanner = scanner
        if request.data.get('job_id'):
            job = Job.objects.get(request.data.get('job_id'))
            attribute.job = job
        if request.data.get('pipeline_id'):
            pipeline = Pipeline.objects.get(request.data.get('pipeline_id'))
            attribute.pipeline = pipeline

        attribute.save()
        return Response({"attribute_id": attribute.id})

    def delete(self, request, pk, format=None):
        Attribute.objects.get(pk=pk).delete()
        return Response()
