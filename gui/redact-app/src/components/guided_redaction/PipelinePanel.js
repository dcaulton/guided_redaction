import React from 'react';

class PipelinePanel extends React.Component {

  constructor(props) {
    super(props)
    this.state = {
      id: '',
      jobs: [],
      active_job_id: '',
      usable_pipeline_ids: [],
    }
//    this.loadRelevantPipelines=this.loadRelevantPipelines.bind(this)
  }

  loadRelevantPipelines(gp_resp_obj) {
    let good_pids = []
    for (let i=0; i < Object.keys(gp_resp_obj['pipelines']).length; i++) {
      const pid = Object.keys(gp_resp_obj['pipelines'])[i]
      const pl = gp_resp_obj['pipelines'][pid]
      if (Object.keys(pl.attributes).includes('display_on_pipelines_panel')) {
        good_pids.push(pl.id)
      }
    }
    if (good_pids.length > 0) {
      this.setState({'usable_pipeline_ids': good_pids})
    }
  }

  componentDidMount() {
    this.props.getPipelines(((resp)=>this.loadRelevantPipelines(resp)))
    this.props.getJobs()
    document.getElementById('pipeline_link').classList.add('active')
  }
   
  viewJob(job_id) {
    this.setState({
      active_job_id: job_id,
    })
  }

  buildJobView() {
    if (!this.state.active_job_id) {
      return ''
    }
    return (
      <div className='col mt-5'>
        <div className='row h5'>
          Job View
        </div>
      </div>
    )
  }

  buildPipelineRuns() {
    let good_jobs = []
    for (let i=0; i < this.props.jobs.length; i++) {
      const job_obj = this.props.jobs[i]
      if (job_obj.operation !== 'pipeline') {
        continue
      }
      if (
        Object.keys(job_obj.attributes).includes('pipeline_job_link')
        && this.state.usable_pipeline_ids.includes(job_obj.attributes['pipeline_job_link'])
      ) {
        good_jobs.push(job_obj)
      }
    }

    return (
      <div className='col mt-5'>
        <div className='row h5'>
          Pipeline Runs
        </div>
        <div className='row'>
          <table className='table table-striped'>
            <thead>
              <tr>
                <td>Pipeline</td>
                <td>Created</td>
                <td>Status</td>
                <td></td>
              </tr>
            </thead>
            <tbody>
              {good_jobs.map((job_obj, index) => {
                const pipeline = this.props.pipelines[job_obj.attributes.pipeline_job_link]
                let status_line = job_obj.status
                if (status_line === 'running') {
                  status_line += ' - ' + Math.floor(100 * parseFloat(job_obj.percent_complete)) + '% done'
                }
                return (
                  <tr key={index}>
                    <td className='p-2'>
                      {pipeline.name}
                    </td>
                    <td className='p-2'>
                      {job_obj.pretty_created_on}
                    </td>
                    <td className='p-2'>
                      {status_line}
                    </td>
                    <td className='p-2'>
                      <button
                        className='btn btn-primary p-1'
                        onClick={()=>this.viewJob(job_obj.id)}
                      >
                        View
                      </button>
                      <button
                        className='btn btn-primary ml-1 p-1'
                        onClick={()=>this.props.cancelJob(job_obj.id)}
                      >
                        Cancel
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  render() {
    const job_view = this.buildJobView()
    const pl_runs = this.buildPipelineRuns()
    return (
      <div className='container'>
        <div id='pipeline_panel' className='row mt-5'>
          <div className='col'>
            <div className='row h3'>
              Pipelines
            </div>
            <div className='row'>
              {job_view}
            </div>
            <div className='row'>
              {pl_runs}
            </div>
          </div>
        </div>
      </div>
    )
  }
}

export default PipelinePanel;
