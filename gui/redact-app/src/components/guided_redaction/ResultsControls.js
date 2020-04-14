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

  setScrubberToResultsClick(movie_url, offset) {
    if (!Object.keys(this.props.movies).includes(movie_url)) {
      this.props.displayInsightsMessage('cannot set scrubber, movie not loaded')
      return
    }
    if (this.props.movie_url !== movie_url) {
      this.props.setCurrentVideo(movie_url)
    }
    setTimeout((() => {this.props.setScrubberToIndex(offset)}), 1000)
  }

  handleImageClick(e, movie_url, image_id) {
    if (!Object.keys(this.props.movies).includes(movie_url)) {
      this.props.displayInsightsMessage('not going to set the scrubber, movie not loaded')
      return
    }
    const x = e.nativeEvent.offsetX
    const x_min = 54
    const x_max = 557
    const x_range = x_max - x_min
    const clicked_x_offset = Math.floor((x - x_min) / x_range * 100)
    if (clicked_x_offset < 0 || clicked_x_offset > 100) {
      return
    }
    this.setScrubberToResultsClick(movie_url, clicked_x_offset)
  }

  getMovieUrlFromChartUrl(chart_url) {
    const movie_uuid_to_end = chart_url.split('chart_').slice(-1)[0]
    const movie_uuid = movie_uuid_to_end.split('__')[0]
    for (let i=0; i < Object.keys(this.props.movies).length; i++) {
      const movie_url = Object.keys(this.props.movies)[i]
      if (movie_url.includes(movie_uuid)) {
        return movie_url
      }
    }
  }

  getIdFromChartUrl(chart_url) {
    const movie_uuid_to_end = chart_url.split('chart_').slice(-1)[0]
    const the_id = movie_uuid_to_end.split('.')[0]
    return the_id
  }

  buildChartsDiv() {
    if (!this.props.results || !Object.keys(this.props.results).includes('charts')) {
      return ''
    }
    return (
      <div>
        {this.props.results['charts'].map((chart_url, index) => {
          const img_id = this.getIdFromChartUrl(chart_url)
          const movie_url = this.getMovieUrlFromChartUrl(chart_url)
          return (
            <div
                key={index}
            >
              <img
                  key={index}
                  id={img_id}
                  src={chart_url}
                  alt='chart displaying template match results'
                  onClick={(e) => this.handleImageClick(e, movie_url, img_id)}
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
      'results_body',
      (() => this.props.toggleShowVisibility('results'))
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
