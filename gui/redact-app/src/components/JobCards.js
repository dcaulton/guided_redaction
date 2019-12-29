import React from 'react'

class JobCardList extends React.Component {

  render() {
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
        </div>
      {sorted_jobs.map((value, index) => {
        return (
        <JobCard
          key={index}
          job_data={value}
          loadInsightsJobResults={this.props.loadInsightsJobResults}
          cancelJob={this.props.cancelJob}
          workbooks={this.props.workbooks}
        />
        )
      })}
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
    let short_job_name = job_data['id']
    if (jn_length > 12) {
      short_job_name = job_data['id'].substring(0, 2) + '...' + 
        job_data['id'].substring(jn_length-2)
    }

    const exp_coll = (
      <button
          className='btn btn-link'
          aria-expanded='false'
          data-target={'#'+job_body_id}
          aria-controls={job_body_id}
          data-toggle='collapse'
          type='button'
      >
        +/-
      </button>
    )


    let status_button = ''
    if (this.props.job_data['status'] === 'running') {
      status_button = (
        <div
          className='col float-right'
        >
        <img
          src='../gr_assets/blue_dot.png'
          height='20'
          alt='running'
        />
        </div>
      )
    } else if (this.props.job_data['status'] === 'success') {
      status_button = (
        <div
          className='col float-right'
        >
        <img
          src='../gr_assets/green_dot.png'
          height='20'
          alt='success'
        />
        </div>
      )
    } else if (this.props.job_data['status'] === 'created') {
      status_button = (
        <div
          className='col float-right'
        >
        <img
          src='../gr_assets/teal_dot.png'
          height='20'
          alt='success'
        />
        </div>
      )
    } else {
      status_button = (
        <div
          className='col float-right'
        >
        <img
          src='../gr_assets/red_dot.png'
          height='20'
          alt='failed or unknown status'
        />
        </div>
      )
    }

    const job_name_data = (
      <div
          className='row ml-2'
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
          onClick={() => this.props.cancelJob(this.props.job_data['id'])}
      >
        Delete
      </button>
    )

    const job_body_id = 'job_body_' + this.props.job_data['id']
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
