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
    }
    this.saveJobResultData=this.saveJobResultData.bind(this)
    this.updateActiveJobStatus=this.updateActiveJobStatus.bind(this)
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
console.log('jah wobble ', response)
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

  buildWipDiagram(content) {
    const nodes_as_rows= this.getNodeIdsAsRows(content)

    return (
      <div>
        {Object.keys(nodes_as_rows).sort().map((row_key, index1) => {
          const nodes_row = nodes_as_rows[row_key]
          return (
            <div 
              key={index1}
              className='row'
            >
              {nodes_row.map((node_id, index2) => {
                let cell_style = {
                }
                return (
                  <div 
                    key={index2}
                    className='col'
                    style={cell_style}
                  >
                    {node_id}
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    )
  }

  buildWorkInProgressSummary() {
    const refresh_button = this.buildRefreshStatusButton()
    if (!this.state.active_job_id) {
      return
    }
    let active_job = this.getActiveJob()
    let active_pipeline = this.getActivePipeline()
    const content = JSON.parse(active_pipeline.content)
    const wip_diagram = this.buildWipDiagram(content)
//console.log('hunchy', content)
// TODO use content['node_metadata']['node'] to get all nodes
//  use content['edges'] to find the order to display them in
//  use the child job ids to get job data
//  maybe have the api return something richer for children: child_operation, status, percent done, name
    const wip_statuses = ['running']
    if (wip_statuses.includes(active_job.status)) {
      return (
        <div className='ml-2'>
          <div>
            {wip_diagram}
          </div>
          <div>
            {refresh_button}
          </div>
        </div>
      )
    } else {
      return (
        <div>
          {refresh_button}
        </div>
      )
    }
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
        className='btn btn-primary'
        onClick={()=>this.refreshJobStatus()}
      >
        Refresh Job Status
      </button>
    )
  }

  buildJobView() {
    if (!this.state.active_job_id) {
      return
    }
    let active_job = this.getActiveJob()
    const req_data_summary = this.buildRequestDataSummary()
    const wip_summary = this.buildWorkInProgressSummary()
    const resp_data_summary = this.buildResponseDataSummary()
    const pipeline = this.getActivePipeline()
    let title = 'Pipeline ' + pipeline.name 
    title += ', job ' + this.state.active_job_id

    return (
      <div className='col mt-5'>
        <div className='row h5'>
          Pipeline Run Detail
        </div>
        <div className='row'>
          {title}
        </div>
        <div className='row'>
          Status: {active_job.status}
        </div>

        <div className='row mt-2'>
          <div className='col-12 font-weight-bold'>
            Data In
          </div>
          <div className='col-12'>
            {req_data_summary}
          </div>
        </div>

        <div className='row mt-2'>
          <div className='col-12 font-weight-bold'>
            Work in Progress
          </div>
          <div className='col-12'>
            {wip_summary}
          </div>
        </div>

        <div className='row mt-2'>
          <div className='col-12 font-weight-bold'>
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
        <div className='row h5'>
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
