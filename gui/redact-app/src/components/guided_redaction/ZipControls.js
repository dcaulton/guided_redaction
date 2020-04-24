import React from 'react';
import {
  makeHeaderRow,
  } from './SharedControls'

class ZipControls extends React.Component {

  buildZipButton() {
    if (Object.keys(this.props.movies).length === 0) {
      return 'no movies to zip'
    }
    return (
      <div className='d-inline'>
        <button
            className='btn btn-primary ml-2 mt-2 dropdown-toggle'
            type='button'
            id='zipDropdownButton'
            data-toggle='dropdown'
            area-haspopup='true'
            area-expanded='false'
        >
          Zip
        </button>
        <div className='dropdown-menu' aria-labelledby='zipDropdownButton'>
          <button className='dropdown-item'
              onClick={() => this.props.submitInsightsJob('zip_current_movie')}
          >
            Movie
          </button>
          <button className='dropdown-item'
              onClick={() => this.props.submitInsightsJob('zip_all_movies')}
          >
            All Movies
          </button>
        </div>
      </div>
    )
  }

  render() {
    if (!this.props.visibilityFlags['zip']) {
      return([])
    }

    const header_row = makeHeaderRow(
      'zip',
      'zip_body',
      (() => this.props.toggleShowVisibility('zip'))
    )
    const zip_button = this.buildZipButton()
    return (
        <div className='row bg-light rounded mt-3'>
          <div className='col'>

            {header_row}

            <div 
                id='zip_body' 
                className='row collapse'
            >
              <div id='zip_main' className='col pb-2'>

                <div id='row mt-2'>
                  {zip_button}
                </div>

              </div>
            </div>

          </div>
        </div>
    )
  }
}

export default ZipControls;
