import React from 'react';
import {
  buildRedactionTypeSelect
} from './redact_utils.js'
import {
  makeHeaderRow,
} from './SharedControls'

class RedactControls extends React.Component {

  buildMaskMethodDropdown() {
    const redaction_select = buildRedactionTypeSelect(                          
      'mask_method',                                                            
      this.props.mask_method,                                                   
      ((event) => this.props.setGlobalStateVar('mask_method', event.target.value))
    )
    return (
      <div>
        <div className='d-inline'>
          Mask method
        </div>
        <div className='d-inline ml-2'>
          {redaction_select}
        </div>
      </div>
    )
  }

  buildRedactButton() {
    if (Object.keys(this.props.movies).length === 0) {
      return
    }
    return (
      <div className='d-inline'>
        <button
            className='btn btn-primary ml-2 mt-2 dropdown-toggle'
            type='button'
            id='redactDropdownButton'
            data-toggle='dropdown'
            area-haspopup='true'
            area-expanded='false'
        >
          Redact
        </button>
        <div className='dropdown-menu' aria-labelledby='redactDropdownButton'>
          <button className='dropdown-item'
              onClick={() => this.props.submitInsightsJob('redact_current_movie')}
          >
            Movie
          </button>
          <button className='dropdown-item'
              onClick={() => this.props.submitInsightsJob('redact_all_movies')}
          >
            All Movies
          </button>
        </div>
      </div>
    )
  }

  render() {
    if (!this.props.visibilityFlags['redact']) {
      return([])
    }

    const header_row = makeHeaderRow(
      'redact',
      'redact_body',
      (() => this.props.toggleShowVisibility('redact'))
    )
    const mask_method_dropdown = this.buildMaskMethodDropdown()
    const redact_button = this.buildRedactButton()
    return (
        <div className='row bg-light rounded mt-3'>
          <div className='col'>

            {header_row}

            <div 
                id='redact_body' 
                className='row collapse'
            >
              <div id='redact_main' className='col'>

                <div id='row mt-2'>
                  {mask_method_dropdown}
                </div>

                <div id='row mt-2'>
                  {redact_button}
                </div>

              </div>
            </div>

          </div>
        </div>
    )
  }
}

export default RedactControls;
