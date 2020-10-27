import React from 'react';

class PipelinePanel extends React.Component {

  constructor(props) {
    super(props)
    this.state = {
      id: '',
      jobs: [],
      active_job_id: '',
      active_job_status_obj: {},
      active_job_request_data: '',
      active_job_response_data: '',
      usable_pipeline_ids: [],
      show_job_status_image: true,
      show_job_status_details: true,
      restart_safety_on: true,
    }
    this.saveJobResultData=this.saveJobResultData.bind(this)
    this.updateActiveJobStatus=this.updateActiveJobStatus.bind(this)
    this.restartJobCompleted=this.restartJobCompleted.bind(this)
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
   
  saveJobResultData(response) {
    const job = response['job']
    const job_resp = JSON.parse(job['response_data'])
    const job_req = JSON.parse(job['request_data'])
    this.setState({
      active_job_response_data: job_resp,
      active_job_request_data: job_req,
    })
  }

  updateActiveJobStatus(response) {
    this.setState({
      active_job_status_obj: response,
    })
  }

  refreshJobStatus() {
    let active_job = this.getActiveJob()
    this.props.getPipelineJobStatus(active_job.id, this.updateActiveJobStatus)
  }

  viewJob(job_id) {
    this.setState({
      active_job_id: job_id,
    })
    this.props.getPipelineJobStatus(job_id, this.updateActiveJobStatus)
    this.props.loadJobResults(job_id, this.saveJobResultData)
  }

  tryToCancelJob(job_id) {
    let resp = window.confirm("Are you sure you want to delete this job?")
    if (resp) {
      this.props.cancelJob(job_id)
    } 
  }

  rankChildren(build_obj, edges, parent_node_id, parent_level_number) {
    for (let i=0; i < Object.keys(edges[parent_node_id]).length; i++) {
      const target_node_id = edges[parent_node_id][i]
      if (!Object.keys(build_obj).includes(String(parent_level_number+1))) {
        build_obj[String(parent_level_number+1)] = []
      }
      if (build_obj[String(parent_level_number+1)].includes(target_node_id)) {
        continue
      }
      build_obj[String(parent_level_number+1)].push(target_node_id)
      if (Object.keys(edges).includes(target_node_id)) {
        this.rankChildren(build_obj, edges, target_node_id, parent_level_number+1)
      }
    }
  }

  getNodeIdsAsRows(content) {
    let all_node_ids = Object.keys(content['node_metadata']['node'])
    for (let i=0; i < Object.keys(content['edges']).length; i++) {
      const edge_start_id = Object.keys(content['edges'])[i]
      for (let j=0; j < content['edges'][edge_start_id].length; j++) {
        const target_node_id = content['edges'][edge_start_id][j]
        if (all_node_ids.includes(target_node_id)) {
          const index = all_node_ids.indexOf(target_node_id)
          if (index > -1) {
            all_node_ids.splice(index, 1)
          }
        }
      }
    }
    if (all_node_ids.length > 1 || all_node_ids.length === 0) {
      console.log('problem determining first node')
      return
    }
    let first_node_id = all_node_ids[0]
    let build_obj = {
      0: [first_node_id],
    }
    this.rankChildren(build_obj, content['edges'], first_node_id, 0)
    return build_obj
  }

  getNodeStatusImage() {
    if (
      this.state.active_job_status_obj 
      && Object.keys(this.state.active_job_status_obj).includes('node_status_image')
      && this.state.active_job_status_obj['node_status_image']
    ) {
      let the_image = (
        <img 
          src={this.state.active_job_status_obj['node_status_image']}
          alt='status'
        />
      )
      if (!this.state.show_job_status_image) {
        the_image = ''
      }
      return (
        <div>
          <div className='row'>
            <div className='col-6 h5'>
              Status at a Glance
            </div>
            <div className='col-2'>
              <input
                type='checkbox'
                checked={!this.state.show_job_status_image}
                onChange={() => this.toggleShowJobStatusImage()}
              />
              <div className='d-inline ml-2'>
                Hide
              </div>
            </div>
          </div>
          <div className='row'>
            <div className='col text-center' id='job_status_image'>
              {the_image}
            </div>
          </div>
        </div>
      )
    }
  }

  toggleRestartSafety() {
    const new_value = (!this.state.restart_safety)
    this.setState({
      restart_safety: new_value,
    })
  }

  toggleShowJobStatusDetails() {
    const new_value = (!this.state.show_job_status_details)
    this.setState({
      show_job_status_details: new_value,
    })
  }

  toggleShowJobStatusImage() {
    const new_value = (!this.state.show_job_status_image)
    this.setState({
      show_job_status_image: new_value,
    })
  }

  restartJobCompleted(response) {
    console.log('restart job finished with ', response)
    this.props.getJobs()
  }

  getLastUpdated(status_obj) {
    let last_updated = ''
    const statuses_needing_restart = ['running', 'created']
    if (this.state.restart_safety || statuses_needing_restart.includes(status_obj['status'])) {
      let restart_button = ''
      if (parseInt(status_obj['minutes_since_last_updated']) > 10) {
        restart_button = (
          <div className='d-inline'>
            <div className='d-inline ml-5 font-weight-italic'>
              this job looks stalled, 
            </div>
            <div className='d-inline ml-2'>
              <button
                className='btn btn-primary ml-1 p-1'
                onClick={()=>this.props.restartJob(status_obj['job_id'], this.restartJobCompleted)}
              >
                Restart
              </button>
            </div>
            <div className='d-inline font-weight-italic'>
              ?
            </div>
          </div>
        )
      }
      
      last_updated = (
        <div>
          <div className='d-inline'>
            Last Updated:
          </div>
          <div className='d-inline ml-2'>
            {status_obj['minutes_since_last_updated']} minutes ago {restart_button}
          </div>
        </div>
      )
    }
    return last_updated
  }

  getNodeJobsList() {
    let node_jobs_list = 'No Node Job Details Available'
    if (
      this.state.active_job_status_obj 
      && Object.keys(this.state.active_job_status_obj).includes('node_statuses')
      && this.state.active_job_status_obj['node_statuses']
    ) {
      const node_statuses = this.state.active_job_status_obj['node_statuses']
      let job_details_style = {}
      const jsi = document.getElementById('job_status_image')
      if (jsi) {
        job_details_style['height'] = jsi.clientHeight
        job_details_style['overflow'] = 'scroll'
      }

      node_jobs_list = (
        <div
        >
          <div className='row'>
            <div className='col-3 h5'>
              Job Details
            </div>

            <div className='col-3'>
              <input
                type='checkbox'
                checked={!this.state.show_job_status_details}
                onChange={() => this.toggleShowJobStatusDetails()}
              />
              <div className='d-inline ml-2'>
                Hide
              </div>
            </div>
          </div>

          <div>
            <input
              type='checkbox'
              checked={!this.state.restart_safety}
              onChange={() => this.toggleRestartSafety()}
            />
            <div className='d-inline ml-2'>
              Restart Safety 
            </div>
            <div className='d-inline font-italic ml-2'>
              (disabling lets you restart any job)
            </div>
          </div>

          <div
          style={job_details_style}
          >
          {Object.keys(node_statuses).map((node_id, index) => {
            if (!this.state.show_job_status_details) {
              return ''
            }
            const status_obj = node_statuses[node_id]
            let percent_complete = (
              <div>
                <div className='d-inline'>
                  Percent Complete:
                </div>
                <div className='d-inline ml-2'>
                  {status_obj['percent_complete']}
                </div>
              </div>
            )
            if (status_obj['status'] !== 'running') {
              percent_complete = ''
            }

            const last_updated = this.getLastUpdated(status_obj)

            return (
              <div key={index} className='border-top'>
                <div>
                  <div className='d-inline'>
                    Node Name: 
                  </div>
                  <div className='d-inline ml-2'>
                    {status_obj['name']}
                  </div>
                </div>
                
                <div>
                  <div className='d-inline'>
                    Operation:
                  </div>
                  <div className='d-inline ml-2'>
                    {status_obj['operation']}
                  </div>
                </div>
                
                <div>
                  <div className='d-inline'>
                    Status:
                  </div>
                  <div className='d-inline ml-2'>
                    {status_obj['status']}
                  </div>
                </div>
                
                {percent_complete}
                
                {last_updated}

                <div>
                  <div className='d-inline'>
                    Framesets In / Out:
                  </div>
                  <div className='d-inline ml-2'>
                    {status_obj['framesets_in']} / {status_obj['framesets_out']}
                  </div>
                </div>
                
                <div className='ml-5 mb-2'>
                  <button
                    className='btn btn-primary'
                    onClick={
                      ()=>this.props.getJobResultData(status_obj['job_id'], this.displayInNewTab)
                    }
                  >
                    View
                  </button>
                </div>
              </div>
            )
          })}
          </div>
        </div>
      )
    }
    return node_jobs_list
  }

  displayInNewTab(page_data) {
    var w = window.open('')
    w.document.write("<textarea style='width:100%;height:100%;'>")
    w.document.write(page_data)
    w.document.write('</textarea>')
  }

  buildStatusSummary() {
    if (!this.state.active_job_id) {
      return
    }
    const node_status_img = this.getNodeStatusImage()
    const node_jobs_list = this.getNodeJobsList()

    return (
      <div className='row'>
        <div className='col-6'>
          {node_status_img}
        </div>
        <div className='col-6 border-left'>
          {node_jobs_list}
        </div>
      </div>
    )
  }

  buildRequestDataSummary() {
    if (!this.state.active_job_id) {
      return
    }
    if (!this.state.active_job_request_data) {
      return
    }
    const movies_summary = String(Object.keys(this.state.active_job_request_data['movies']).length) + ' movies'
    return (
      <div className='ml-2'>
        {movies_summary}
      </div>
    )
  }

  buildResponseDataSummary() {
    if (!this.state.active_job_id) {
      return
    }
    if (!this.state.active_job_response_data) {
      return
    }
    let resp_movies = {}
    if (Object.keys(this.state.active_job_response_data).includes('movies')) {
      resp_movies = this.state.active_job_response_data['movies']
      
    } else {
      resp_movies = this.state.active_job_response_data
    }
    const movies_summary = String(Object.keys(resp_movies).length) + ' movies returned'

    let build_redacted_movies = []
    const ak = Object.keys(resp_movies)[0]
    const am = resp_movies[ak]
    if (Object.keys(am).length === 1) {
      const first_key = Object.keys(am)[0]
      if (first_key === 'redacted_movie_url') {
        build_redacted_movies = (
          <div>
            <div className='font-weight-bold'>
              Redacted Movies:
            </div>
            {Object.keys(resp_movies).sort().map((movie_url, index) => {
              const movie = resp_movies[movie_url]
              const short_name = movie['redacted_movie_url'].split('/').slice(-1)[0]
              return (
                <div key={index}>
                  <a href={movie['redacted_movie_url']}>
                    {short_name}
                  </a>
                </div>
              )
            })}
          </div>
        )
      }
    }

    return (
      <div className='ml-2'>
        {movies_summary}
        {build_redacted_movies}
      </div>
    )
  }

  getActiveJob() {
    for (let i=0; i < this.props.jobs.length; i++) {
      const job = this.props.jobs[i]
      if (job['id'] === this.state.active_job_id) {
        return job
      }
    }
  }

  getActivePipeline() {
    let active_job = this.getActiveJob()
    if (!active_job) {
      return
    }
    const pipeline = this.props.pipelines[active_job.attributes.pipeline_job_link]
    return pipeline
  }

  buildRefreshStatusButton() {
    return (
      <button
        className='btn btn-primary p-1'
        onClick={()=>this.refreshJobStatus()}
      >
        Refresh
      </button>
    )
  }

  buildJobView() {
    if (!this.state.active_job_id) {
      return
    }
    let active_job = this.getActiveJob()
    const req_data_summary = this.buildRequestDataSummary()
    const status_summary = this.buildStatusSummary()
    const resp_data_summary = this.buildResponseDataSummary()
    const pipeline = this.getActivePipeline()
    const refresh_button = this.buildRefreshStatusButton()
    let title = 'Pipeline ' + pipeline.name 
    title += ', job ' + this.state.active_job_id

    return (
      <div className='col mt-5'>
        <div className='row h2'>
          Pipeline Run Detail
        </div>
        <div className='row'>
          {title}
        </div>
        <div className='row'>
          Status: {active_job.status}
        </div>

        <div className='row mt-2'>
          <div className='col-12 h4 border-top border-bottom mt-5 bg-light'>
            Data In
          </div>
          <div className='col-12'>
            {req_data_summary}
          </div>
        </div>

        <div className='row mt-2'>
          <div className='col-10 h4 border-top border-bottom mt-5 bg-light'>
            Job Status
          </div>
          <div className='col-2 h4 border-top border-bottom mt-5 bg-light'>
            {refresh_button}
          </div>
        </div>

        <div className='row mt-2'>
          <div className='col'>
            {status_summary}
          </div>
        </div>

        <div className='row mt-2'>
          <div className='col-12 h4 border-top border-bottom mt-5 bg-light'>
            Data Out
          </div>
          <div className='col-12'>
            {resp_data_summary}
          </div>
        </div>

      </div>
    )
  }

  buildRuns() {
    let good_jobs = []
    for (let i=0; i < this.props.jobs.length; i++) {
      const job_obj = this.props.jobs[i]
      if (job_obj.operation !== 'pipeline') {
        continue
      }
      if (
        Object.keys(job_obj).includes('attributes')
        && Object.keys(job_obj.attributes).includes('pipeline_job_link')
        && this.state.usable_pipeline_ids
        && this.state.usable_pipeline_ids.includes(job_obj.attributes['pipeline_job_link'])
      ) {
        good_jobs.push(job_obj)
      }
    }

    return (
      <div className='col mt-5'>
        <div className='row h2'>
          Pipeline Runs
        </div>
        <div className='row'>
          <table className='table table-striped'>
            <thead className='font-weight-bold'>
              <tr>
                <td>Pipeline</td>
                <td>Created</td>
                <td>Status</td>
                <td></td>
              </tr>
            </thead>
            <tbody>
              {good_jobs.map((job_obj, index) => {
                let tr_style = {}
                if (job_obj.id === this.state.active_job_id) {
                  tr_style['border'] = '5px black solid'
                }
                const pipeline = this.props.pipelines[job_obj.attributes.pipeline_job_link]
                let status_line = job_obj.status
                if (status_line === 'running') {
                  status_line += ' - ' + Math.floor(100 * parseFloat(job_obj.percent_complete)) + '% done'
                }
                return (
                  <tr 
                      key={index}
                      style={tr_style}
                  >
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
                        onClick={()=>this.tryToCancelJob(job_obj.id)}
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
    const pl_runs = this.buildRuns()
    return (
      <div className='container'>
        <div id='pipeline_panel' className='row mt-5'>
          <div className='col'>
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
