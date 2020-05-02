import React from 'react';
import {
  buildLabelAndDropdown,
  makeHeaderRow,
  } from './SharedControls'

class OcrMovieAnalysisControls extends React.Component {

  constructor(props) {
    super(props)
    this.state = {
      debug_level: '',
    }
  }

  setLocalStateVar(var_name, var_value, when_done=(()=>{})) {
    this.setState({
      [var_name]: var_value,
      unsaved_changes: true,
    },
    when_done())
  }

  buildRunButton() {
    if (Object.keys(this.props.movies).length === 0) {
      return 'no movies to analyze'
    }
    const job_params = {
      debug_level: this.state.debug_level,
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
          Run
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

  render() {
    if (!this.props.visibilityFlags['ocr_movie_analysis']) {
      return([])
    }

    const header_row = makeHeaderRow(
      'ocr movie analysis',
      'oma_body',
      (() => this.props.toggleShowVisibility('ocr_movie_analysis'))
    )
    const run_button = this.buildRunButton()
    const debug_level_dropdown = this.buildDebugLevelDropdown()
    return (
        <div className='row bg-light rounded mt-3'>
          <div className='col'>

            {header_row}

            <div 
                id='oma_body' 
                className='row collapse'
            >
              <div id='oma_main' className='col pb-2'>

                <div id='row mt-2'>
                  {debug_level_dropdown}
                </div>

                <div id='row mt-2'>
                  {run_button}
                </div>

              </div>
            </div>

          </div>
        </div>
    )
  }
}

export default OcrMovieAnalysisControls;
