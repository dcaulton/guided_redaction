import React from 'react'
import JobBug from './JobBug'

class JobCardList extends React.Component {
  
  buildMultiIdString() {
    let build_string = ''
    for (let i=0; i < this.props.jobs.length; i++) {
      build_string += '#job_card_' + i.toString()
      if (i < this.props.jobs.length - 1) {
        build_string += ','
      }
    }
    return build_string
  }

  buildCollapseAllCardsLink() {
    let style = {
      'fontSize': 'small',
      'padding': 0,
    }
    const ids_to_collapse = this.buildMultiIdString()

    return (
      <div
        className='d-inline m-2'
      >
        <button
            style={style}
            className='btn btn-link'
            aria-expanded='false'
            data-target={ids_to_collapse}
            aria-controls={ids_to_collapse}
            data-toggle='collapse'
            type='button'
        >
          +/-
        </button>
      </div>
    )
  }

  render() {
    const collapse_all_link = this.buildCollapseAllCardsLink() 
    const sorted_jobs = this.props.jobs.sort((a, b) => (a.created_on < b.created_on) ? 1 : -1)

    return (
      <div>
        <div className='row'>
          <div className='h3'>
            Jobs
          </div>
          <JobBug
            jobs={this.props.jobs}
            attached_job={this.props.attached_job}
          />
					<button                                                       
							className='btn btn-primary mt-2 ml-2'                     
							onClick={() => this.props.getJobs()}                      
					>                                                             
						Refresh
					</button>  
          {collapse_all_link}
        </div>
        <div 
          id='job_card_wrapper' 
          className='ml-3'
        >
          {sorted_jobs.map((value, index) => {
            return (
            <JobCard
              key={index}
              job_data={value}
              loadInsightsJobResults={this.props.loadInsightsJobResults}
              cancelJob={this.props.cancelJob}
              preserveJob={this.props.preserveJob}
              jobs={this.props.jobs}
              index={index}
              getJobResultData={this.props.getJobResultData}
              getJobFailedTasks={this.props.getJobFailedTasks}
              wrapUpJob={this.props.wrapUpJob}
              attachToJob={this.props.attachToJob}
              attached_job={this.props.attached_job}
            />
            )
          })}
        </div>
      </div>
    )
  }
}


class JobCard extends React.Component {

  constructor(props) {
    super(props)
    let bg_color_name = '#FFF'
    if (this.props.job_data['status'] === 'purged') {
      bg_color_name = '#777'
    }
    const the_style = {
      backgroundColor: bg_color_name,
      padding: 0,
      margin: 0,
    }

    this.view_image = (
      <svg width="50" height="30" xmlns="http://www.w3.org/2000/svg" style={the_style}>
        <path d="M 0 14 C 8  2, 22  2, 30 14" stroke="black" fill="transparent"/>
        <path d="M 0 14 C 8 26, 22 26, 30 14" stroke="black" fill="transparent"/>
        <circle cx="14" cy="14" r="8" fill="#8D4008"/>
        <circle cx="14" cy="14" r="4" fill="#000"/>
        <path d="M 9 13 C 10 8, 13 10, 14 9" stroke="#CCCCCC" fill="transparent" strokeWidth="2" />
      </svg>
    )
  }

  buildJobHeader(job_data, job_body_id) {
    const jn_length = job_data['id'].length
    let sjn = job_data['id']
    if (jn_length > 12) {
      sjn = job_data['id'].substring(0, 8) + '...'
    }
    let short_job_name = (
      <div 
        className='col-md-6 p-0 ml-3'
        title={job_data['id']}
      >
      {sjn}
      </div>
    )

    let style = {
      'fontSize': 'small',
      'padding': 0,
    }
    const exp_coll = (
      <div className='col-md-1 p-0 m-0'>
      <button
          style={style}
          className='btn btn-link'
          aria-expanded='false'
          data-target={'#'+job_body_id}
          aria-controls={job_body_id}
          data-toggle='collapse'
          type='button'
      >
        +/-
      </button>
      </div>
    )


    let green_circle_style = {
      stroke: '#27A929',
      strokeWidth: '1px',
      fill: 'solid',
    }
    let light_blue_circle_style = {
      stroke: '#2DDEFF',
      strokeWidth: '1px',
      fill: 'solid',
    }
    let dark_blue_circle_style = {
      stroke: '#443CF3',
      strokeWidth: '1px',
      fill: 'solid',
    }
    let red_circle_style = {
      stroke: '#FF1D44',
      strokeWidth: '1px',
      fill: 'solid',
    }
    let black_circle_style = {
      stroke: '#000000',
      strokeWidth: '1px',
      fill: 'solid',
    }

    let status_button = ''
    if (this.props.job_data['status'] === 'running') {
      status_button = (
        <div
          className='col-md-1'
        >
          <svg width='20' height='21' >
            <circle
                r='9'
                fill='#443CF3'
                cx='10'
                cy='10'
                style={dark_blue_circle_style}
            />
          </svg>
        </div>
      )
    } else if (this.props.job_data['status'] === 'success') {
      status_button = (
        <div
          className='col-md-1 '
        >
          <svg width='20' height='21' >
            <circle
                r='9'
                fill='#27A929'
                cx='10'
                cy='10'
                style={green_circle_style}
            />
          </svg>
        </div>
      )
    } else if (this.props.job_data['status'] === 'created') {
      status_button = (
        <div
          className='col-md-1'
        >
          <svg width='20' height='21' >
            <circle
                r='9'
                fill='#2DDEFF'
                cx='10'
                cy='10'
                style={light_blue_circle_style}
            />
          </svg>
        </div>
      )
    } else if (this.props.job_data['status'] === 'purged') {
      status_button = (
        <div
          className='col-md-1'
        >
          <svg width='20' height='21' >
            <circle
                r='9'
                fill='#000000'
                cx='10'
                cy='10'
                style={black_circle_style}
            />
          </svg>
        </div>
      )
    } else {
      status_button = (
        <div
          className='col-md-1'
        >
          <svg width='20' height='21' >
            <circle
                r='9'
                fill='#FF1D44'
                cx='10'
                cy='10'
                style={red_circle_style}
            />
          </svg>
        </div>
      )
    }

    const job_name_data = (
      <div
          className='row'
      >
        {short_job_name}
        {exp_coll}
        {status_button}
      </div>
    )
    return job_name_data
  }

  buildJobDescriptionData(job_data) {
    let jd_length = job_data['description'].length
    let jd_desc = job_data['description']
    if (jd_length > 10) {
      if (jd_desc.indexOf(':') > 0) {
        jd_desc = jd_desc.substring(0,jd_desc.indexOf(':'))
      }
    }
    return (
      <div
        title={job_data['description']}
      >
        {jd_desc}
      </div>
    )
  }

  buildCreatedOnData(job_data) {
    return (
      <div>
        created {job_data['pretty_created_on']}
      </div>
    )
  }

  buildWallClockRunTimeData(job_data) {
    let wcrt = job_data['wall_clock_run_time'].split('.')[0]
    return (
      <div>
        run time: {wcrt}
      </div>
    )
  }

  buildPercentDone(job_data) {
    if (job_data['percent_complete'] === 0) {
      return ''
    }
    if (job_data['percent_complete'] === 1) {
      return ''
    }
    const elapsed_percent = parseInt(job_data['percent_complete'] * 100).toString() + '% done'
    return (
      <div>
        {elapsed_percent}
      </div>
    )
  }

  buildGetJobButton() {
    if (this.props.job_data['status'] === 'success') {
      return (
        <button 
            className='btn btn-primary'
            onClick={() => this.props.loadInsightsJobResults(
              this.props.job_data['id']
            )}
        >
          Load
        </button>
      )
    }
    return ''
  }

  buildDeleteJobButton() {
    return (
      <button 
          className='btn btn-primary ml-2'
          onClick={() => this.props.cancelJob(this.props.job_data['id'])}
      >
        Delete
      </button>
    )
  }

  buildPreserveJobButton() {
    if (
      this.props.job_data &&
      Object.keys(this.props.job_data).includes('attributes') &&
      Object.keys(this.props.job_data['attributes']).includes('auto_delete_age') &&
      this.props.job_data['attributes']['auto_delete_age'] === 'never'
    ) {
      return ''
    }
    return (
      <button 
          className='btn btn-primary ml-2'
          onClick={() => this.props.preserveJob(this.props.job_data['id'])}
      >
        Keep
      </button>
    )
  }

  buildJobStatus() {
    let text_style = {
      'fontSize': '14px',
    }
    let container_style = {
      backgroundColor: 'white',
    }
    if (this.props.job_data['status'] === 'purged') {
      container_style['backgroundColor'] = '#777'
    }
    return (
      <div>
        <div className='d-inline' style={container_style}>
          {this.props.job_data['status']}
        </div>
        <div 
            className='d-inline ml-2'
            style={text_style}
        >
          <button
              type="button"
              className="border-0 bg-white"
              onClick={() => this.showJobResults(this.props.job_data['id'])}
              data-toggle="modal"
              data-target="#insightsPanelModal"
          >
            {this.view_image}
          </button>
        </div>
      </div>
    )
  }

  showJobResults(job_id) {
    if (this.jobIsLarge()) {
      for (let i=0; i < this.props.jobs.length; i++) {
        if (this.props.jobs[i]['id'] === job_id) {
          const job = this.props.jobs[i]
          this.displayInNewTab(JSON.stringify(job, undefined, 2))
        }
      }
    } else {
      this.props.getJobResultData(job_id, this.displayInNewTab)
    }
  }

  displayInNewTab(page_data) {
    var w = window.open('')
    w.document.write("<textarea style='width:100%;height:100%;'>")
    w.document.write(page_data)
    w.document.write('</textarea>')
  }

  buildWrapUpLink() {
    if (this.props.job_data['status'] === 'success') {
      return ''
    }
    return (
      <div className='d-inline'>
        <button 
            className='btn btn-link border-none p-0 mt-0'
            onClick={() => this.props.wrapUpJob(this.props.job_data['id'])}
        >
          wrap up
        </button>
      </div>
    )
  }

  buildAttachLink() {
    if (this.props.job_data['status'] !== 'running') {
      return ''
    }
    if (this.props.job_data['id'] === this.props.attached_job['id']) {
      return (
        <div className='d-inline ml-4 h5 text-success'>
          attached
        </div>
      )
    }
    return (
      <div className='d-inline ml-4'>
        <button 
            className='btn btn-link border-none p-0 mt-0'
            onClick={() => this.props.attachToJob(this.props.job_data['id'])}
        >
          attach
        </button>
      </div>
    )
  }

  jobIsLarge() {
    if (
      this.props.job_data['response_size'] === 'very large' ||
      this.props.job_data['request_size'] === 'very large'
    ) {
      return true
    }
  }

  buildLargeWarning() {
    if (!this.jobIsLarge()) {
      return ''
    }

    let request_data_link = ''
    let request_data_action;
    if (Object.keys(this.props.job_data).includes('request_data_url')) {
      const request_data_url = this.props.job_data['request_data_url']
      request_data_action = () => window.open(request_data_url)
    } else {
      request_data_action = () => this.props.getJobResultData(this.props.job_data['id'], this.displayInNewTab, 'request')
    }
    request_data_link = (
      <div className='d-inline ml-1'>
        <button
          className='btn btn-link text-light p-0 m-0'
          onClick={request_data_action}
        >
          Q
        </button>
      </div>
    )

    let response_data_link = ''
    let response_data_action;
    if (Object.keys(this.props.job_data).includes('response_data_url')) {
      const response_data_url = this.props.job_data['response_data_url']
      response_data_action = () => window.open(response_data_url)
    } else {
      response_data_action = () => this.props.getJobResultData(this.props.job_data['id'], this.displayInNewTab, 'response')
    }
    response_data_link = (
      <div className='d-inline ml-1'>
        <button
          className='btn btn-link text-light p-0 m-0'
          onClick={response_data_action}
        >
          R
        </button>
      </div>
    )

    return (
      <div className='col bg-danger rounded font-weight-bold'>
        <div className='d-inline text-light'>
          XL Payloads
        </div>
        {request_data_link}
        {response_data_link}
      </div>
    )

  }

  buildViewFailedTasksLink() {
    if (this.props.job_data['status'] !== 'failed') {
      return ''
    }
    return (
      <button
        className='btn btn-link border-none p-0 mt-0'
        onClick={() => this.props.getJobFailedTasks(this.props.job_data['id'], this.displayInNewTab)}
      >
        view failed tasks
      </button>
    )
  }

  render() {
    let small_style = {
      'fontSize': 'small',
      'display': 'block',
    }
    let top_level_card_classes = 'row pl-1 mt-2 card'
    if (this.props.job_data['status'] === 'purged') {
      top_level_card_classes += ' bg-secondary'
    }
    const get_job_button = this.buildGetJobButton()
    const delete_job_button = this.buildDeleteJobButton()
    const preserve_job_button = this.buildPreserveJobButton()
    const job_body_id = 'job_card_' + this.props.index
    const job_header = this.buildJobHeader(this.props.job_data, job_body_id)
    const job_desc_data = this.buildJobDescriptionData(this.props.job_data)
    const job_created_on_data = this.buildCreatedOnData(this.props.job_data)
    const wall_clock_run_time_data = this.buildWallClockRunTimeData(this.props.job_data)
    const job_percent_done = this.buildPercentDone(this.props.job_data)
    const job_status = this.buildJobStatus()
    const wrap_up_link = this.buildWrapUpLink()
    const attach_link = this.buildAttachLink()
    const large_warning = this.buildLargeWarning()
    const view_failed_tasks_link = this.buildViewFailedTasksLink()

    return (
      <div className={top_level_card_classes}>

        <div className='col'>

          <div className='row border-bottom'>
            {job_header}
          </div>

          <div 
              id={job_body_id}
              className='collapse show'
          >
            <div 
                className='row mt-1'
                style={small_style}
            >
              {job_desc_data}
            </div>

            <div className='row h4'>
              {job_status}
            </div>

            <div 
                className='row'
                style={small_style}
            >
              {job_created_on_data}
              {wall_clock_run_time_data}
              {job_percent_done}
            </div>

            <div 
                className='row'
                style={small_style}
            >
              {wrap_up_link}
              {attach_link}
            </div>

            <div className='row'>
              {view_failed_tasks_link}
            </div>

            <div className='row'>
              {large_warning}
            </div>

            <div className='row mt-1 mb-1'>
              {get_job_button}
              {delete_job_button}
              {preserve_job_button}
            </div>
          </div>

        </div>
      </div>
    )
  }
}

export default JobCardList;
