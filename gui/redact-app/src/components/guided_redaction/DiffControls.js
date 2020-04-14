import React from 'react';
import {
  makeHeaderRow,
} from './SharedControls'

class DiffControls extends React.Component {

  buildDiffRunButton() {
    let movie_set_keys = Object.keys(this.props.movie_sets)
    return (
      <div className='d-inline'>
        <button
            className='btn btn-primary ml-2 mt-2 dropdown-toggle'
            type='button'
            id='runDiffsDropdownButton'
            data-toggle='dropdown'
            area-haspopup='true'
            area-expanded='false'
        >
          Calculate
        </button>
        <div className='dropdown-menu' aria-labelledby='runDiffsDropdownButton'>
          <button className='dropdown-item'
              onClick={() => this.props.submitInsightsJob('diffs_current_image')}
          >
            Image
          </button>
          <button className='dropdown-item'
              onClick={() => this.props.submitInsightsJob('diffs_current_movie')}
          >
            Movie
          </button>
          <button className='dropdown-item'
              onClick={() => this.props.submitInsightsJob('diffs_all_movies')}
          >
            All Movies
          </button>
    {movie_set_keys.map((value, index) => {
      return (
        <button
            className='dropdown-item'
            key={index}
            onClick={() => this.props.submitInsightsJob('diffs_movie_set', value)}
        >
          MovieSet '{this.props.movie_sets[value]['name']}'
        </button>
      )
    })}
        </div>
      </div>
    )
  }

  toggleImageTypeToDisplay() {
    if (this.props.imageTypeToDisplay === 'diff') {
      this.props.setImageTypeToDisplay('')
    } else {
      this.props.setImageTypeToDisplay('diff')
    }
  }

  buildToggleImageTypeToDisplayCheckbox() {
    return (
      <div>
        <input
          className='mr-2 mt-3'
          type='checkbox'
          onChange={() => this.toggleImageTypeToDisplay()}
        /> Show Diffs
      </div>
    )
  }

  render() {
    if (!this.props.visibilityFlags['diffs']) {
      return([])
    }
    const run_button = this.buildDiffRunButton()
    const itd_checkbox = this.buildToggleImageTypeToDisplayCheckbox()
    const header_row = makeHeaderRow(
      'diffs',
      'diff_body',
      (() => this.props.toggleShowVisibility('diffs'))
    )

    return (
        <div className='row bg-light rounded mt-3'>
          <div className='col'>

            {header_row}

            <div 
                id='diff_body' 
                className='row collapse'
            >
              <div id='diffs_main' className='col'>

                <div className='row bg-light'>
                  <div className='d-inline ml-2 mt-2' >   
                  {run_button}
                  </div>

                  <div className='d-inline ml-2 p-2 border' >   
                {itd_checkbox}
                  </div>

                  <div className='d-inline ml-2 mt-2' >   
                    <button
                        className='btn btn-primary ml-2'
                        onMouseDown={() => this.props.blinkDiff('on')}
                        onMouseUp={() => this.props.blinkDiff('off')}
                    >
                      Blink
                    </button>
                  </div>


                </div>

              </div>
            </div>

          </div>
        </div>
    )
  }
}

export default DiffControls;
