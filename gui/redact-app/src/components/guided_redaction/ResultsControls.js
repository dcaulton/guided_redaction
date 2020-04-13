import React from 'react';
import {
  makeHeaderRow,
} from './SharedControls'

class ResultsControls extends React.Component {
  constructor(props) {
    super(props)
    this.state = ({
      type: '',
      job_id: '',
    })
  }

  submitResultsJob() {
    const pass_data = {
      type: this.state.type,
      job_id: this.state.job_id,
    }
    this.props.submitInsightsJob('results', pass_data)
  }

  buildTypeSelector() {
    return (
      <div>
        <div className='d-inline'>
          Report Type:
        </div>
        <div className='d-inline ml-2'>
          <select
              name='report_type'
              value={this.state.type}
              onChange={(event) => this.setType(event.target.value)}
          >
            <option value=''></option>
            <option value='template_match_chart'>template match chart</option>
            <option value='selected_area_chart'>selected area chart</option>
            <option value='ocr_match_chart'>ocr match chart</option>
          </select>
        </div>
      </div>
    )
  }

  setJobId(job_id) {
    this.setState({
      job_id: job_id,
    })
  }

  setType(the_type) {
    this.setState({
      type: the_type,
    })
  }

  buildJobSelector() {
    let eligible_jobs = []
    for (let i=0; i < this.props.jobs.length; i++) {
      const job = this.props.jobs[i]
      if (this.state.type === 'template_match_chart' && 
          job['operation'] === 'scan_template_threaded') {
        eligible_jobs.push(job)
      } else if (this.state.type === 'ocr_match_chart' && 
          job['operation'] === 'scan_ocr') {
      } else if (this.state.type === 'selected_area_chart' && 
          job['operation'] === 'selected_area_threaded') {
        eligible_jobs.push(job)
      }
    }

    return (
      <div>
        <div className='d-inline'>
          Job Results
        </div>
        <div className='d-inline ml-2'>
          <select
              name='report_job'
              value={this.state.job_id}
              onChange={(event) => this.setJobId(event.target.value)}
          >
            <option value=''></option>
            {eligible_jobs.map((job, index) => {
              return (
                <option value={job['id']} key={index}>{job['id']}</option>
              )
            })}
          </select>
        </div>
      </div>
    )
  }

  buildSubmitButton() {
    return (
      <div>
        <button
            className='btn btn-primary'
            onClick={() => this.submitResultsJob()}
        >
          Submit Job
        </button>
      </div>
    )
  }

  buildChartsDiv() {
    if (!this.props.results || !Object.keys(this.props.results).includes('charts')) {
      return ''
    }
    return (
      <div>
        {this.props.results['charts'].map((chart_url, index) => {
          return (
            <div
                key={index}
            >
              <img
                  key={index}
                  src={chart_url}
                  alt='chart displaying template match results'
              />
            </div>
          )
        })}
      </div>
    )
  }

  render() {
    if (!this.props.visibilityFlags['results']) {
      return([])
    }
    const header_row = makeHeaderRow(
      'results',
      'results_body'
    )
    const type_selector = this.buildTypeSelector()
    const job_selector = this.buildJobSelector()
    const submit_button = this.buildSubmitButton()
    const charts_div = this.buildChartsDiv()

    return (
        <div className='row bg-light rounded mt-3'>
          <div className='col'>

            {header_row}

            <div 
                id='results_body' 
                className='row collapse'
            >
              <div id='results_main' className='col'>

                <div className='row mt-3 bg-light'>
                  {type_selector}
                </div>

                <div className='row bg-light'>
                  {job_selector}
                </div>

                <div className='row bg-light'>
                  {submit_button}
                </div>

                <div id='results_image_div' className='row mt-3 bg-light'>
                  {charts_div}
                </div>

              </div>
            </div>

          </div>
        </div>
    )
  }
}

export default ResultsControls;
