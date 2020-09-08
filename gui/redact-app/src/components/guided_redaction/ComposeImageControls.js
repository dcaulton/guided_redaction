import React from 'react'

class ComposeImageControls extends React.Component {
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
                  Run {this.props.templates[value]['name']} on this frame
                </button>
                <button className='dropdown-item'
                    key={alt_index}
                    onClick={() => 
                      this.props.runTemplateRedactPipelineJob(this.props.templates[value]['id'], 'all')
                    }
                >
                  Run {this.props.templates[value]['name']} on all frames 
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
              onClick={() => this.props.setMode('add_1_ocr')} 
              href='.'
          >
            OCR matches
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

  buildIllustrateResetButton() {
    return (
      <button 
          className='btn btn-light ml-2' 
          onClick={() => this.props.clearCurrentIllustrations()}
          style={this.button_style}
          href='./index.html' >
        Reset
      </button>
    )
  }

  buildIllustrateButton() {
    return (
      <div id='illustrate_div' className='d-inline ml-2'>
        <button 
            className='btn btn-light dropdown-toggle' 
            style={this.button_style}
            type='button' 
            id='illustrateDropdownButton'
            data-toggle='dropdown' 
            aria-haspopup='true' 
            aria-expanded='false'
        >
          Illustrate
        </button>
        <div className='dropdown-menu' aria-labelledby='illustrateDropdownButton'>
          <button 
              className='dropdown-item' 
              onClick={() => this.props.setMode('illustrate_oval_1')} 
          >
            Oval
          </button>
          <button 
              className='dropdown-item' 
              onClick={() => this.props.setMode('illustrate_oval_shaded_1')} 
          >
            Oval - shaded background
          </button>
          <button 
              className='dropdown-item' 
              onClick={() => this.props.setMode('illustrate_box_1')} 
          >
            Box
          </button>
          <button 
              className='dropdown-item' 
              onClick={() => this.props.setMode('illustrate_box_shaded_1')} 
          >
            Box - shaded background
          </button>
        </div>
      </div>
    )
  }

  buildGotoPrecisionLearningButton() {
    if (!this.props.displayPrecisionLearning) {
      return ''
    }
    return (
      <div className='d-inline ml-2'>
        <button 
          className='btn btn-light'
          style={this.button_style}
          onClick={()=>{this.props.startPrecisionLearning()}}
        >
          Go to Precision Learning
        </button>
      </div>
    )
  }

  render() {

    let add_button = ''
    let reset_button = ''
    let template_button = ''
    let illustrate_button = ''
    let goto_precision_learning_button = this.buildGotoPrecisionLearningButton()
    if (this.props.displayImageControls) {
      add_button = this.buildAddButton()
      reset_button = this.buildResetButton()
    }
    if (this.props.displayRunTemplateControls) {
      const template_keys = Object.keys(this.props.templates)
      if (template_keys.length) {
        template_button = this.buildTemplateButton()
        if (template_button) {
          reset_button = this.buildResetButton()
        }
      } else {
        template_button = '(no templates available)'
      }
    }
    if (this.props.displayIllustrateControls) {
      illustrate_button = this.buildIllustrateButton()
      reset_button = this.buildIllustrateResetButton()
    }

    return (
    <div className='row'>
        <div className='col'>
          {add_button}
          {template_button}
          {reset_button}
          {illustrate_button}
          {goto_precision_learning_button}
        </div>
    </div>
    );
  }
}

export default ComposeImageControls
