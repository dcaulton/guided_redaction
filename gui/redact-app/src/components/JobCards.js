import React from 'react'

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
          <h3>Jobs</h3>
					<button                                                       
							className='btn btn-primary mt-2 ml-2'                     
							onClick={() => this.props.getJobs()}                      
					>                                                             
						Refresh
					</button>  
          {collapse_all_link}
        </div>
        <div id='job_card_wrapper'>
          {sorted_jobs.map((value, index) => {
            return (
            <JobCard
              key={index}
              job_data={value}
              loadInsightsJobResults={this.props.loadInsightsJobResults}
              cancelJob={this.props.cancelJob}
              workbooks={this.props.workbooks}
              index={index}
            />
            )
          })}
        </div>
      </div>
    )
  }
}


class JobCard extends React.Component {

  getWorkbookName(the_workbook_id) {
    for (let i=0; i < this.props.workbooks.length; i++) {
      if (this.props.workbooks[i]['id'] === the_workbook_id) {
        return this.props.workbooks[i]['name']
      }
    }
  }

  buildJobWorkbookBlock(job_data) {
    let job_workbook_name = 'no workbook'
    if (job_data['workbook_id']) {
        job_workbook_name = this.getWorkbookName(job_data['workbook_id'])
    }
    let job_workbook_block = (
      <div className='row mt-1'>
        {job_workbook_name}
      </div>
    )
    return job_workbook_block
  }

  buildJobResponseData(job_data) {
    let job_response_data = ''
    if (job_data['status'] === 'failed') {
      job_response_data = (
        <div className='row mt-1'>
          {job_data['response_data']}
        </div>
      )
    }
    return job_response_data
  }

  buildJobHeader(job_data, job_body_id) {
    const jn_length = job_data['id'].length
    let sjn = job_data['id']
    if (jn_length > 12) {
      sjn = job_data['id'].substring(0, 2) + '...' + 
        job_data['id'].substring(jn_length-2)
    }
    let short_job_name = (
      <div className='col-md-7'>
      {sjn}
      </div>
    )

    let style = {
      'fontSize': 'small',
      'padding': 0,
    }
    const exp_coll = (
      <div className='col-md-2'>
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

    let status_button = ''
    if (this.props.job_data['status'] === 'running') {
      status_button = (
        <div
          className='col-md-2 float-right'
        >
          <svg width='20' height='22' >
            <circle
                r='10'
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
          className='col-md-2 float-right'
        >
          <svg width='20' height='22' >
            <circle
                r='10'
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
          className='col-md-2 float-right'
        >
          <svg width='20' height='22' >
            <circle
                r='10'
                fill='#2DDEFF'
                cx='10'
                cy='10'
                style={light_blue_circle_style}
            />
          </svg>
        </div>
      )
    } else {
      status_button = (
        <div
          className='col-md-2 float-right'
        >
          <svg width='20' height='22' >
            <circle
                r='10'
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
    let job_desc_data = ''
    let jd_length = job_data['description'].length
    let jd_desc = job_data['description']
    if (jd_length > 10) {
      if (jd_desc.indexOf(':') > 0) {
        jd_desc = jd_desc.substring(0,jd_desc.indexOf(':'))
      }
    }
    job_desc_data = (
      <div className='row mt-1'>
        <span title={job_data['description']}>
          {jd_desc}
        </span>
      </div>
    )
    return job_desc_data
  }

  buildCreatedOnData(job_data) {
    return (
      <div className='row mt-1 pl-3'>
        <span title={job_data['created_on']}>
          created {job_data['pretty_created_on']}
        </span>
      </div>
    )
  }

  render() {
    let get_job_button = ''
    if (this.props.job_data['status'] === 'success') {
      get_job_button = (
        <button 
            className='btn btn-primary m-2'
            onClick={() => this.props.loadInsightsJobResults(
              this.props.job_data['id']
            )}
        >
          Load
        </button>
      )
    }
    let delete_job_button = (
      <button 
          className='btn btn-primary m-2'
          onClick={() => this.props.cancelJob(this.props.job_data)}
      >
        Delete
      </button>
    )

    const job_body_id = 'job_card_' + this.props.index
    const job_header = this.buildJobHeader(this.props.job_data, job_body_id)
    const job_response_data = this.buildJobResponseData(this.props.job_data)
    const job_workbook_block = this.buildJobWorkbookBlock(this.props.job_data)
    const job_desc_data = this.buildJobDescriptionData(this.props.job_data)
    const job_created_on_data = this.buildCreatedOnData(this.props.job_data)

    return (
      <div className='row pl-1 mt-2 card'>

        <div className='col'>

          <div className='row border-bottom'>
            {job_header}
          </div>

          <div 
              id={job_body_id}
              className='collapse show'
          >
            {job_desc_data}
            <div className='row h4'>
              {this.props.job_data['status']}
            </div>
            {job_response_data}
            <div className='row mt-1'>
              {job_created_on_data}
            </div>
            {job_workbook_block}
            <div className='row mt-1'>
              {get_job_button}
              {delete_job_button}
            </div>
          </div>

        </div>
      </div>
    )
  }
}

export default JobCardList;
