import React from 'react';
import {
  buildRedactionTypeSelect,
  buildRedactionErodeIterationsSelect,
  buildRedactionBucketClosenessSelect,
  buildRedactionMinContourAreaSelect,
  buildRedactionReplaceWithSelect
} from './redact_utils.js'
import {
  makeHeaderRow,
} from './SharedControls'

class RedactControls extends React.Component {

  setGlobalMaskMethod(mask_method) {
    let deepCopyRedactRule = JSON.parse(JSON.stringify(this.props.redact_rule))
    deepCopyRedactRule['mask_method'] = mask_method
    this.props.setGlobalStateVar('redact_rule', deepCopyRedactRule)
  }

  buildMaskMethodDropdown() {
    const redaction_select = buildRedactionTypeSelect(                          
      'mask_method',                                                            
      this.props.redact_rule.mask_method,                                                   
      ((event) => this.setGlobalMaskMethod(event.target.value))
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

  buildReplaceWithDropdown() {
    const redaction_replace_with = buildRedactionReplaceWithSelect(
      'replace_with',
      this.props.redact_rule,
      ((event) => this.setGlobalReplaceWith(event.target.value))
    )
    return redaction_replace_with
  }

  buildErodeIterationsDropdown() {
    const erode_iterations = buildRedactionErodeIterationsSelect(
      'erode_iterations',
      this.props.redact_rule,
      ((event) => this.setGlobalErodeIterations(event.target.value))
    )
    return erode_iterations
  }

  buildBucketClosenessDropdown() {
    const bucket_closeness = buildRedactionBucketClosenessSelect(
      'erode_iterations',
      this.props.redact_rule,
      ((event) => this.setGlobalBucketCloseness(event.target.value))
    )
    return bucket_closeness
  }

  buildMinContourAreaDropdown() {
    const bucket_closeness = buildRedactionMinContourAreaSelect(
      'min_contour_area',
      this.props.redact_rule,
      ((event) => this.setGlobalMinContourArea(event.target.value))
    )
    return bucket_closeness
  }

  setGlobalReplaceWith(the_value) {                                             
    let deepCopyRedactRule = JSON.parse(JSON.stringify(this.props.redact_rule)) 
    deepCopyRedactRule['replace_with'] = the_value                              
    this.props.setGlobalStateVar('redact_rule', deepCopyRedactRule)             
  }                                                                             
    
  setGlobalErodeIterations(the_value) {
    let deepCopyRedactRule = JSON.parse(JSON.stringify(this.props.redact_rule))
    deepCopyRedactRule['erode_iterations'] = the_value
    this.props.setGlobalStateVar('redact_rule', deepCopyRedactRule)
  }

  setGlobalBucketCloseness(the_value) {
    let deepCopyRedactRule = JSON.parse(JSON.stringify(this.props.redact_rule))
    deepCopyRedactRule['bucket_closeness'] = the_value
    this.props.setGlobalStateVar('redact_rule', deepCopyRedactRule)
  }

  setGlobalMinContourArea(the_value) {
    let deepCopyRedactRule = JSON.parse(JSON.stringify(this.props.redact_rule))
    deepCopyRedactRule['min_contour_area'] = the_value
    this.props.setGlobalStateVar('redact_rule', deepCopyRedactRule)
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
    const replace_with = this.buildReplaceWithDropdown()
    const erode_iterations = this.buildErodeIterationsDropdown()
    const bucket_closeness = this.buildBucketClosenessDropdown()
    const min_contour_area = this.buildMinContourAreaDropdown()

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

                {replace_with}
                {erode_iterations}
                {bucket_closeness}
                {min_contour_area}

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
