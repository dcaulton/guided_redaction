import React from 'react';
import {
  buildLabelAndTextInput, 
  makeHeaderRow,
  makePlusMinusRow,
} from './SharedControls'


class ResultsControls extends React.Component {
  constructor(props) {
    super(props)
    this.state = ({
      type: '',
      job_id: '',
      manually_specify_job_id: false,
    })
  }

  buildManuallySpecify() {
    let checked_state = ''
    if (this.state.manually_specify_job_id) {
      checked_state = 'checked'
    }
    return (
      <div className='ml-2'>
        <div className='d-inline'>
          Manually Specify Job Id
        </div>
        <div className='d-inline'>
          <input
            className='ml-2 mr-2 mt-1'
            id='toggle_manually_specify'
            checked={checked_state}
            type='checkbox'
            onChange={() => this.toggleManuallySpecify()}
          />
        </div>
      </div>
    )
  }

  toggleManuallySpecify() {
    const new_value = (!this.state.manually_specify_job_id)
    this.setState({
      manually_specify_job_id: new_value,
    })
  }

  buildJobIdField() {
    if (!this.state.manually_specify_job_id) {
      return
    }
    return buildLabelAndTextInput(
      this.state.job_id,
      'Job Id',
      'results_job_id',
      'job_id',
      40,
      ((value)=>{this.setLocalStateVar('job_id', value)})
    )
  }

  setLocalStateVar(var_name, var_value, when_done=(()=>{})) {
    function anon_func() {
      when_done()
    }
    this.setState(
      {
        [var_name]: var_value,
      },
      anon_func
    )
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
              onChange={(event) => this.setLocalStateVar('type', event.target.value)}
          >
            <option value=''></option>
            <option value='template_match_chart'>template match chart</option>
            <option value='selected_area_chart'>selected area chart</option>
            <option value='ocr_match_chart'>ocr match chart</option>
            <option value='ocr_scene_analysis_chart'>ocr scene analysis chart</option>
            <option value='selection_grower_chart'>selection grower chart</option>
          </select>
        </div>
      </div>
    )
  }

  buildJobSelector() {
    if (this.state.manually_specify_job_id) {
      return
    }
    let eligible_jobs = []
    for (let i=0; i < this.props.jobs.length; i++) {
      const job = this.props.jobs[i]
      if (this.state.type === 'template_match_chart' && 
          job['operation'] === 'scan_template_threaded') {
        eligible_jobs.push(job)
      } else if (this.state.type === 'ocr_match_chart' && 
          job['operation'] === 'scan_ocr_threaded') {
        eligible_jobs.push(job)
      } else if (this.state.type === 'ocr_scene_analysis_chart' && 
          job['operation'] === 'ocr_scene_analysis_threaded') {
        eligible_jobs.push(job)
      } else if (this.state.type === 'selected_area_chart' && 
          job['operation'] === 'selected_area_threaded') {
        eligible_jobs.push(job)
      } else if (this.state.type === 'selection_grower_chart' && 
          job['operation'] === 'selection_grower_threaded') {
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
              onChange={(event) => this.setLocalStateVar('job_id', event.target.value)}
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
    const movie_uuid_to_end_2 = chart_url.split('chart_').slice(-1)[0]
    const movie_uuid = movie_uuid_to_end_2.split('.')[0]
    const directory_uuid = chart_url.split('/').slice(-2)[0]
    const new_str = directory_uuid + '_' + movie_uuid
    return new_str
  }

  getMovieNameFromUrl(movie_url) {
    const movie_name = movie_url.split('/').slice(-1)[0]
    return movie_name
  }

  moveResultToTop(movie_url) {
    let deepCopyResults = JSON.parse(JSON.stringify(this.props.results))
    let ordered_results = [movie_url]
    let movie_list = Object.keys(deepCopyResults['movies'])
    if (Object.keys(deepCopyResults).includes('movie_display_order')) {
      movie_list = deepCopyResults['movie_display_order']
    }
    for (let i=0; i < movie_list.length; i++) {
      const this_movie_url = movie_list[i]
      if (this_movie_url !== movie_url) {
        ordered_results.push(this_movie_url)
      }
    }
    deepCopyResults['movie_display_order'] = ordered_results
    this.props.setGlobalStateVar('results', deepCopyResults)
  }

  buildMoveUpLink(movie_url) {
    return (
      <button
        className='btn btn-link'
        onClick={() => this.moveResultToTop(movie_url)}
      >
        move to top
      </button>
    )
  }

  movieChartResultsExist() {
    for (let i=0; i < Object.keys(this.props.results['movies']).length; i++) {
      const movie_url = Object.keys(this.props.results['movies'])[i]
      if (Object.keys(this.props.results['movies'][movie_url]).includes('charts')) {
        return true
      }
    }
    return false
  }

  framesetChartResultsExist() {
    for (let i=0; i < Object.keys(this.props.results['movies']).length; i++) {
      const movie_url = Object.keys(this.props.results['movies'])[i]
      for (let j=0; j < Object.keys(this.props.results['movies'][movie_url]['framesets']).length; j++) {
        const frameset_hash = Object.keys(this.props.results['movies'][movie_url]['framesets'])[j]
        if (Object.keys(this.props.results['movies'][movie_url]['framesets'][frameset_hash]).includes('charts')) {
          return true
        }
      }
    }
    return false
  }

  buildChartsDiv() {
    if (!this.props.results || !Object.keys(this.props.results).includes('movies')) {
      return ''
    }
    if (this.movieChartResultsExist()) {
      return this.buildMovieChartsDiv()
    } else if (this.framesetChartResultsExist()) {
      return this.buildFramesetChartsDiv()
    }
  }

  buildFramesetChartsDiv() {
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
          const charts_for_movie = this.buildFramesetChartsForMovie(movie_url)
          return (
            <div 
                className='mt-2 pb-3'
                key={index}
            >
              {show_hide_row}

              <div
                className='collapse show'
                id={row_id}
              >
                <div className='row m-2'>
                  <div className='col-lg-9'>
                    {charts_for_movie}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  buildShowChartInModalLink(chart_url) {
    return (
      <button
        className='border-0 text-primary'
        onClick={() => this.props.setModalImage(chart_url)}
      >
        show
      </button>
    )
  }

  buildFramesetChartsForMovie(movie_url) {
    if (!Object.keys(this.props.results['movies'][movie_url]).includes('framesets')) {
      return
    }
    const image_fit_style = {
      'width': '100%',
    }
    const frameset_hashes = Object.keys(this.props.results['movies'][movie_url]['framesets'])
    return (
      <div>
        {frameset_hashes.map((frameset_hash, frameset_index) => {
          if (!Object.keys(this.props.results['movies'][movie_url]['framesets'][frameset_hash]).includes('charts')) {
            return ''
          }
          const charts = this.props.results['movies'][movie_url]['framesets'][frameset_hash]['charts']
          return (
            <div
              key={frameset_index}
              className='row mt-3'
            >
              <div 
              >
                frameset {frameset_hash}
              </div>
              {charts.map((chart_url, chart_index) => {
                const show_in_modal_link = this.buildShowChartInModalLink(chart_url)
                const img_id = this.getIdFromChartUrl(chart_url)
                return (
                  <div
                    key={chart_index}
                  >
                    <div>
                      {show_in_modal_link}
                    </div>
                    <img
                        key={chart_index}
                        id={img_id}
                        src={chart_url}
                        style={image_fit_style}
                        alt='chart displaying osa results'
                    />
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    )
  }

  buildMovieChartsDiv() {
    let movie_urls = []
    if (Object.keys(this.props.results).includes('movie_display_order')) {
      movie_urls = this.props.results['movie_display_order']
    } else {
      movie_urls = Object.keys(this.props.results['movies'])
    }
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
          let move_up_link = ''
          if (index) {
            move_up_link = this.buildMoveUpLink(movie_url) 
          }
          return (
            <div 
                className='mt-2 pb-3'
                key={index}
            >
              {show_hide_row}

              <div
                className='collapse show'
                id={row_id}
              >
                <div className='row m-2'>
                  <div className='col-lg-9'>
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
                  <div className='col-lg-3'>
                    {move_up_link}
                  </div>
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
    const manually_specify = this.buildManuallySpecify()
    const job_id_field = this.buildJobIdField()

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
                  {manually_specify}
                </div>
                <div className='row mt-2 bg-light'>
                  {job_id_field}
                </div>
                <div className='row mt-2 bg-light'>
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
