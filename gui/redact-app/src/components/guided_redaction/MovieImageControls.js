import React from 'react'

class MovieImageControls extends React.Component {
  constructor(props) {
    super(props)
    this.button_style = {
      borderColor: 'black',
    }
  }

  resetImage() {
    this.props.clearCurrentFramesetChanges(this.props.setMessage('image has been reset'))
  }

  buildTemplateButton() {
    const template_keys = Object.keys(this.props.templates)
    return (
      <div id='template_div' className='d-inline'>
        <button 
            className='btn btn-light dropdown-toggle ml-2' 
            style={this.button_style}
            type='button' 
            id='templateDropdownButton'
            data-toggle='dropdown' 
            aria-haspopup='true' 
            aria-expanded='false'
        >
          Template
        </button>
        <div className='dropdown-menu' aria-labelledby='tempateDropdownButton'>
          {template_keys.map((value, index) => {
            const alt_index = index.toString() + '_alt'
            const div_index = index.toString() + '_div'
            return (
              <div
                  key={div_index}
              >
                <button className='dropdown-item'
                    key={index}
                    onClick={() => this.props.runTemplateRedactPipelineJob(this.props.templates[value]['id'])}
                >
                  Run and redact {this.props.templates[value]['name']} on this frame
                </button>
                <button className='dropdown-item'
                    key={alt_index}
                    onClick={() => 
                      this.props.runTemplateRedactPipelineJob(this.props.templates[value]['id'], 'all')
                    }
                >
                  Run and redact {this.props.templates[value]['name']} on all frames 
                </button>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  buildAddButton() {
    return (
      <div id='add_div' className='d-inline'>
        <button 
            className='btn btn-light dropdown-toggle' 
            style={this.button_style}
            type='button' 
            id='addDropdownButton'
            data-toggle='dropdown' 
            aria-haspopup='true' 
            aria-expanded='false'
        >
          Redact
        </button>
        <div 
            className='dropdown-menu' 
            aria-labelledby='addDropdownButton'
        >
          <button 
              className='dropdown-item' 
              onClick={() => this.props.setMode('add_1_box')}
          >
            Box
          </button>
          <button 
              className='dropdown-item' 
              onClick={() => this.props.setMode('add_1_box_through_pet')}
          >
            Box - this frame through processing end time
          </button>
          <button 
              className='dropdown-item' 
              onClick={() => this.props.setMode('add_1_ocr')} 
              href='.'
          >
            OCR
          </button>
          <button 
              className='dropdown-item' 
              onClick={() => this.props.setMode('add_1_ocr_through_pet')} 
              href='.'
          >
            OCR - this frame, then mask through processing end time
          </button>
        </div>
      </div>
    )
  }

  buildResetButton() {
    return (
      <button 
          className='btn btn-light ml-2' 
          onClick={() => this.resetImage()}
          style={this.button_style}
          href='./index.html' >
        Reset
      </button>
    )
  }

  buildProcessingEndDialog() {
    return (
      <div>
        <div className='d-inline'>
          Processing end time:
        </div>
        <div className='d-inline ml-1'>
          <select
            name='processing_end_seconds'
            onChange={(event) => this.props.setProcessingEndMinutes(event.target.value)}
            value={this.props.processing_end_minutes}
          >
            {[...Array(60).keys()].map((index) => {
              return (
                <option value={index} key={index}>{index}</option>
              )
            })}
          </select>
        </div>
        <div className='d-inline ml-1'>
          mins
        </div>
        <div className='d-inline ml-1'>
          <select
            name='processing_end_seconds'
            onChange={(event) => this.props.setProcessingEndSeconds(event.target.value)}
            value={this.props.processing_end_seconds}
          >
            {[...Array(60).keys()].map((index) => {
              return (
                <option value={index} key={index}>{index}</option>
              )
            })}
          </select>
        </div>
        <div className='d-inline ml-1'>
          secs
        </div>
      </div>
    )
  }
  render() {
    if (!this.props.getImageUrl()) {
      return ''
    }
    let add_button = this.buildAddButton()
    let reset_button = this.buildResetButton()
    let template_button = this.buildTemplateButton()
    let processing_end_dialog = this.buildProcessingEndDialog()

    return (
      <div className='col'>
        <div className='row'>
          <div className='col-8'>
            {add_button}
            {template_button}
            {reset_button}
          </div>

          <div className='col-4 float-right'>
            {processing_end_dialog}
          </div>
        </div>
      </div>
    );
  }
}

export default MovieImageControls
