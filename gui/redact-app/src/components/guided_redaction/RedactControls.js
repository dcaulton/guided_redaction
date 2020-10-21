import React from 'react';
import {
  buildRedactionRuleControls,
} from './redact_utils.js'
import {
  makeHeaderRow,
} from './SharedControls'

class RedactControls extends React.Component {

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

  buildRedactRuleControls() {
    if (!this.props.redact_rule_current_id) {
      return ''
    }
    return buildRedactionRuleControls(
      this.props.redact_rules,
      this.props.redact_rule_current_id,
      this.props.setGlobalStateVar
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
    const redact_button = this.buildRedactButton()
    const redact_rule_controls = this.buildRedactRuleControls()

    return (
        <div className='row bg-light rounded mt-3'>
          <div className='col'>

            {header_row}

            <div 
                id='redact_body' 
                className='row collapse'
            >
              <div id='redact_main' className='col'>
                {redact_rule_controls}

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
