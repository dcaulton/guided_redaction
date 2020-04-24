import React from 'react';
import {
  makeHeaderRow,
  } from './SharedControls'

class OcrMovieAnalysisControls extends React.Component {

  buildRunButton() {
    if (Object.keys(this.props.movies).length === 0) {
      return 'no movies to analyze'
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
              onClick={() => this.props.submitInsightsJob('ocr_movie_analysis_current_movie')}
          >
            Movie
          </button>
          <button className='dropdown-item'
              onClick={() => this.props.submitInsightsJob('ocr_movie_analysis_all_movies')}
          >
            All Movies
          </button>
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
    const run_button = this.buildRunButton()
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
