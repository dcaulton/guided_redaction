import React from 'react';
import {
  buildLabelAndDropdown,
  buildLabelAndTextInput,
  makePlusMinusRowLight,
  makeHeaderRow,
  } from './SharedControls'

class OcrMovieAnalysisControls extends React.Component {

  constructor(props) {
    super(props)
    this.state = {
      id: '',
      name: '',
      debug_level: '',
      skip_frames: 10,
      min_app_width: 100,
      min_app_height: 100,
      max_rta_neighborhood_area: 1000*1000,
      max_header_height: 100,
      max_header_vertical_separation:10,
      max_header_width_difference: 10,
      first_run_job_id: '',
      apps: {},
      attributes: {},
      unsaved_changes: false,
    }
    this.addAppCallback=this.addAppCallback.bind(this)
    this.setLocalStateVar=this.setLocalStateVar.bind(this)
    this.getOcrMovieAnalysisRuleFromState=this.getOcrMovieAnalysisRuleFromState.bind(this)
    this.setLocalStateVarNoWarning=this.setLocalStateVarNoWarning.bind(this)
  }

  getOcrMovieAnalysisRuleFromState() {
    const oma_rule = {
      id: this.state.id,
      name: this.state.name,
      debug_level: this.state.debug_level,
      skip_frames: this.state.skip_frames,
      min_app_width: this.state.min_app_width,
      min_app_height: this.state.min_app_height,
      max_rta_neighborhood_area: this.state.max_rta_neighborhood_area,
      max_header_height: this.state.max_header_height,
      max_header_vertical_separation: this.state.max_header_vertical_separation,
      max_header_width_difference: this.state.max_header_width_difference,
      first_run_job_id: this.state.first_run_job_id,
      apps: this.state.apps,
      attributes: this.state.attributes,
    }
    return oma_rule
  }

  componentDidMount() {
    this.props.addInsightsCallback('oma_pick_app', this.getCurrentAnchors)
  }

  addAppCallback(clicked_coords) {
//    const app_id = 'app_' + Math.floor(Math.random(1000000, 9999999)*1000000000).toString()
console.log('adding an app')
  }

  setLocalStateVar(var_name, var_value, when_done=(()=>{})) {
    this.setState({
      [var_name]: var_value,
      unsaved_changes: true,
    },
    when_done())
  }

  setLocalStateVarNoWarning(var_name, var_value, when_done=(()=>{})) {
    this.setState({
      [var_name]: var_value,
      unsaved_changes: false,
    },
    when_done())
  }

  buildFirstRunButton() {
    if (this.props.movie_url === 'first_scan_apps') {
      return
    }
    const job_params = {
      debug_level: this.state.debug_level,
      skip_frames: this.state.skip_frames,
    }
    return (
      <div className='d-inline'>
        <button
            className='btn btn-primary ml-2 mt-2 dropdown-toggle'
            type='button'
            id='omaDropdownButton'
            data-toggle='dropdown'
            area-haspopup='true'
            area-expanded='false'
        >
          Process First Scan
        </button>
        <div className='dropdown-menu' aria-labelledby='omaDropdownButton'>
          <button className='dropdown-item'
              onClick={() => this.props.submitInsightsJob('ocr_movie_analysis_current_movie', job_params)}
          >
            Movie
          </button>
          <button className='dropdown-item'
              onClick={() => this.props.submitInsightsJob('ocr_movie_analysis_all_movies', job_params)}
          >
            All Movies
          </button>
        </div>
      </div>
    )
  }

  buildAndSubmitRescanJob() {
    console.log('submitting rescan job')
//              this.props.submitInsightsJob('ocr_movie_analysis_all_movies', job_params)
  }

  buildRescanButton() {
    if (!this.state.first_run_job_id) {
      return
    }
    return (
      <button
          className='btn btn-primary ml-2 mt-2'
          onClick={() => this.buildAndSubmitRescanJob()}
      >
        Rescan
      </button>
    )
  }

  getEligibleRescanJobs() {
    let eligible_jobs = []
    for (let i=0; i < this.props.jobs.length; i++) {
      const job = this.props.jobs[i]
      if (job['operation'] === 'oma_first_scan_threaded') {
        eligible_jobs.push(job)
      }
    }
    return eligible_jobs
  }

  buildRescanJobSelector() {
    const eligible_jobs = this.getEligibleRescanJobs()

    return (
      <div>
        <div className='d-inline'>
          First Scan Job Id
        </div>
        <div className='d-inline ml-2'>
          <select
              name='oma_first_scan_job'
              value={this.state.first_run_job_id}
              onChange={(event) => this.setLocalStateVar('first_run_job_id', event.target.value)}
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

  buildDebugLevelDropdown() {
    const values = [
      {'': 'none'},
      {'normal': 'normal, shared folder'},
      {'everything': 'everything'},
    ]
    return buildLabelAndDropdown(
      values,
      'Debug level',
      this.state.debug_level,
      'oma_debug_level',
      ((value)=>{this.setLocalStateVar('debug_level', value)})
    )
  }

  buildSkipFrames() {
    return buildLabelAndTextInput(
      this.state.skip_frames,
      'Skip Frames',
      'oma_skip_frames',
      'skip frames',
      4,
      ((value)=>{this.setLocalStateVar('skip_frames', value)})
    )
  }

  buildMaxHeaderHeight() {
    return buildLabelAndTextInput(
      this.state.max_header_height,
      'Max Header Height',
      'oma_max_header_height',
      'max header height',
      6,
      ((value)=>{this.setLocalStateVar('max_header_height', value)})
    )
  }

  buildMaxHeaderVerticalSeparation() {
    return buildLabelAndTextInput(
      this.state.max_header_vertical_separation,
      'Max Header Vertical Separation',
      'oma_max_header_vertical_separation',
      'max header vertical separation',
      6,
      ((value)=>{this.setLocalStateVar('max_header_vertical_separation', value)})
    )
  }

  buildMaxHeaderWidthDifference() {
    return buildLabelAndTextInput(
      this.state.max_header_width_difference,
      'Max Header Width Difference',
      'oma_max_header_width_difference',
      'max header width difference',
      6,
      ((value)=>{this.setLocalStateVar('max_header_width_difference', value)})
    )
  }

  buildMinAppWidth() {
    return buildLabelAndTextInput(
      this.state.min_app_width,
      'Min App Width',
      'oma_min_app_width',
      'min app width',
      6,
      ((value)=>{this.setLocalStateVar('min_app_width', value)})
    )
  }

  buildMinAppHeight() {
    return buildLabelAndTextInput(
      this.state.min_app_height,
      'Min App Height',
      'oma_min_app_height',
      'min app height',
      6,
      ((value)=>{this.setLocalStateVar('min_app_height', value)})
    )
  }

  buildMaxRtaNeighborhoodArea() {
    return buildLabelAndTextInput(
      this.state.max_rta_neighborhood_area,
      'Max Rta Neighborhood Area',
      'oma_max_rta_neighborhood_area',
      'max rta neighborhood area',
      12,
      ((value)=>{this.setLocalStateVar('max_rta_neighborhood_area', value)})
    )
  }

  buildRescanHeader() {
    return (
      <div className='row border-top border-bottom mt-4 mb-2 h5'>
        <div className='col-lg-2'>
        </div>
        <div className='col-lg-9 pt-2 pb-2'>
          rescan
        </div>
      </div>
    )
  }

  buildPickAppButton() {
    if (this.props.movie_url !== 'first_scan_apps') {
      return
    }
    return (
      <button
          className='btn btn-primary ml-2 mt-2'
          onClick={() => this.props.handleSetMode('oma_pick_app')}
      >
        Pick App
      </button>
    )
  }

  buildApsPanel() {
    return (
      <div>
        APPS:
      </div>
    )
  }

  showOriginalImage() {
    console.log('showing original image')
    const cur_hash = this.props.getFramesetHashForImageUrl(this.props.insights_image)
    const frameset = this.props.movies[this.props.movie_url]['framesets'][cur_hash]
    const source_image = frameset['source_image']
    this.props.setInsightsImage(source_image)
  }

  buildShowOriginalImageButton() {
    return (
      <button
          className='btn btn-primary ml-2 mt-2'
          onClick={() => this.showOriginalImage()}
      >
        Show Original Image
      </button>
    )
  }

  buildRescanPanel() {
    const rescan_header = this.buildRescanHeader()
    const eligible_jobs = this.getEligibleRescanJobs()
    if (eligible_jobs.length === 0) {
      return (
        <div>
          {rescan_header}

          <div className='h3 font-italic'>
            no jobs to rescan
          </div>
        </div>
      )
    }

    const first_run_job_selector = this.buildRescanJobSelector()
    const rescan_button = this.buildRescanButton()
    const min_app_width = this.buildMinAppWidth()
    const min_app_height = this.buildMinAppHeight()
    const max_rta_neighborhood_area = this.buildMaxRtaNeighborhoodArea()
    const max_header_height = this.buildMaxHeaderHeight()
    const max_header_vertical_separation = this.buildMaxHeaderVerticalSeparation()
    const max_header_width_difference = this.buildMaxHeaderWidthDifference()
    const pick_app_button = this.buildPickAppButton()
    const apps_panel = this.buildApsPanel()
    const show_original_image_button = this.buildShowOriginalImageButton()
    return (
      <div>
        {rescan_header}

        <p>
          Rescanning will apply the following parameters, as well as the apps you have selected
          from the frames, to the fields detected by the OCR from some OMA first run, as identified 
          by First Scan Job Id
        </p>

        <div className='row mt-2'>
          {show_original_image_button}
        </div>

        <div className='row mt-2'>
          {min_app_width}
        </div>

        <div className='row mt-2'>
          {min_app_height}
        </div>

        <div className='row mt-2'>
          {max_rta_neighborhood_area}
        </div>

        <div className='row mt-2'>
          {max_header_height}
        </div>

        <div className='row mt-2'>
          {max_header_vertical_separation}
        </div>

        <div className='row mt-2'>
          {max_header_width_difference}
        </div>

        <div className='row mt-2'>
          {first_run_job_selector}
        </div>

        <div className='row mt-2'>
          {apps_panel}
        </div>

        <div className='row mt-2'>
          {pick_app_button}
        </div>

        <div className='row mt-2'>
          {rescan_button}
        </div>

      </div>
    )
  }

  buildFirstScanPanel() {
    if (Object.keys(this.props.movies).length === 0) {
      return (
        <div className='h3 font-italic'>
          no movies to analyze
        </div>
      )
    }
    const skip_frames = this.buildSkipFrames()
    const first_run_button = this.buildFirstRunButton()
    return (
      <div 
          id='oma_first_run_div'
          className='collapse show'
      >
        <p>
          The first run processes OCR against all the (nonskipped) frames and applies 
          the OMA rules a first time.  Due to the fact that it's OCR, it
          will run much slower than subsequent Rescans. 
        </p>

        <div className='row mt-2'>
          {skip_frames}
        </div>

        <div className='row mt-2'>
          {first_run_button}
        </div>
      </div>
    )
  }

  render() {
    if (!this.props.visibilityFlags['ocr_movie_analysis']) {
      return([])
    }

    const header_row = makeHeaderRow(
      'ocr movie analysis',
      'oma_body',
      (() => this.props.toggleShowVisibility('ocr_movie_analysis'))
    )
    const debug_level_dropdown = this.buildDebugLevelDropdown()
    const show_hide_first_run = makePlusMinusRowLight('first run', 'oma_first_run_div')
    const first_scan_panel = this.buildFirstScanPanel()
    const rescan_panel = this.buildRescanPanel()
    return (
        <div className='row bg-light rounded mt-3'>
          <div className='col'>

            {header_row}

            <div 
                id='oma_body' 
                className='row collapse ml-1 mr-1'
            >
              <div id='oma_main' className='col pb-2'>

                <div className='row mt-2'>
                  {debug_level_dropdown}
                </div>

                {show_hide_first_run}
                {first_scan_panel}

                {rescan_panel}

              </div>
            </div>

          </div>
        </div>
    )
  }
}

export default OcrMovieAnalysisControls;
