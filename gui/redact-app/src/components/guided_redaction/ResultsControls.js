import React from 'react';
import {
  makeHeaderRow,
  makePlusMinusRow,
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

  clearResults() {
    this.props.setGlobalStateVar('results', {})
    this.props.displayInsightsMessage('all results have been cleared')
  }

  buildClearButton() {
    return (
      <div className='ml-2'>
        <button
            className='btn btn-primary'
            onClick={() => this.clearResults()}
        >
          Clear all Jobs
        </button>
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

  getIdFromChartUrl(chart_url) {
    const movie_uuid_to_end = chart_url.split('chart_').slice(-1)[0]
    const the_id = movie_uuid_to_end.split('.')[0]
    return the_id
  }

  getMovieNameFromUrl(movie_url) {
    const movie_name = movie_url.split('/').slice(-1)[0]
    return movie_name
  }

  buildChartsDiv() {
    if (!this.props.results || !Object.keys(this.props.results).includes('movies')) {
      return ''
    }
    const movie_urls = Object.keys(this.props.results['movies'])
    return (
      <div className='col'>
        {movie_urls.map((movie_url, index) => {
          let movie_name = ''
          if (movie_url) {
              movie_name = 'movie ' + this.getMovieNameFromUrl(movie_url)
          }
          const row_id = 'results_movie_image_row_' + index.toString()
          const show_hide_row = makePlusMinusRow(movie_name, row_id)
          const chart_urls = this.props.results['movies'][movie_url]['charts']
          const wrap_div_style = {
            'minHeight': '700px',
          }
          return (
            <div 
                className='mt-2 pb-3'
                key={index}
            >
              {show_hide_row}

              <div
                id={row_id}
              >
                <div className='row m-2'>
                    {chart_urls.map((chart_url, chart_index) => {
                      const img_id = this.getIdFromChartUrl(chart_url)
                      return (
                        <div 
                            key={chart_index}
                            className='d-inline ml-2'
                        >
                          <button
                            key={chart_index}
                            className='border-0 btn btn-primary'
                            onClick={() => this.toggleImageVisibility(img_id)}
                          >
                            {chart_index.toString()}
                          </button>
                        </div>
                      )
                    })}
                </div>

                <div
                    key={index}
                    className='row card'
                    style={wrap_div_style}
                >
                  <div className='card-body'>
                  {chart_urls.map((chart_url, chart_index) => {
                    const img_id = this.getIdFromChartUrl(chart_url)
                    return (
                      <div
                          key={chart_index}
                          className='card-img-overlay'
                      >
                        <img
                            key={chart_index}
                            id={img_id}
                            src={chart_url}
                            alt='chart displaying template match results'
                            onClick={(e) => this.handleImageClick(e, movie_url, img_id)}
                        />
                      </div>
                    )
                  })}
                  </div>
                </div>
              </div>

            </div>
          )
        })}
      </div>
    )
  }

  toggleImageVisibility(img_id) {
    let ele = document.getElementById(img_id)
    if (ele.style.display === 'none') {
      ele.style.display = 'block'
    } else if (ele.style.display === 'block') {
      ele.style.display = 'none'
    } else {
      ele.style.display = 'none'
    }
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
    const clear_button = this.buildClearButton()
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

                <div className='row mt-2 bg-light'>
                  {job_selector}
                </div>

                <div className='row mt-2 bg-light'>
                  {submit_button}
                  {clear_button}
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
