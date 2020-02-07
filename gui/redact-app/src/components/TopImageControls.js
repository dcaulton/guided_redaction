import React from 'react';

class TopImageControls extends React.Component {
  doClearRedaction() {
    this.props.clearCurrentFramesetRedactions(this.props.setMessage('image redactions reset'))
  }

  buildWhenDoneLink() {
    if (this.props.image_url === '') {
      return ''
    }
    if (this.props.whenDoneTarget) {
      return (
        <button 
            className='btn btn-primary ml-2'  
            onClick={() => this.props.gotoWhenDoneTarget()}
        >
          Goto Precision Learning 
        </button>
      )
    }
  }

  buildTemplateButton() {
    if (this.props.image_url === '') {
      return ''
    }
    const template_keys = Object.keys(this.props.templates)
    if (!template_keys.length) {
      return ''
    }
    return (
      <div id='template_div' className='d-inline'>
        <button className='btn btn-primary dropdown-toggle ml-2' type='button' id='templateDropdownButton'
            data-toggle='dropdown' aria-haspopup='true' aria-expanded='false'>
          Template
        </button>
        <div className='dropdown-menu' aria-labelledby='tempateDropdownButton'>
          {template_keys.map((value, index) => {
            return (
              <button className='dropdown-item'
                  key={index}
                  onClick={() => this.props.submitImageJob('template_match', this.props.templates[value]['id'])}
                  href='.'>
                Run {this.props.templates[value]['name']}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  buildRedactedLink() {
    let redacted_link = ''
    if (this.props.getRedactedImageUrl()) {
      let redacted_filename = this.props.getRedactedImageUrl().split('/') 
      redacted_link = (
          <a 
              href={this.props.getRedactedImageUrl()}
              download={redacted_filename}
          >
            download 
          </a>
      )
    }
    return redacted_link
  }

  buildAddButton() {
    if (this.props.image_url === '') {
      return ''
    }
    return (
      <div id='add_div' className='d-inline'>
        <button className='btn btn-primary dropdown-toggle' type='button' id='addDropdownButton'
            data-toggle='dropdown' aria-haspopup='true' aria-expanded='false'>
          Add
        </button>
        <div className='dropdown-menu' aria-labelledby='addDropdownButton'>
          <button className='dropdown-item' 
              onClick={() => this.props.setMode('add_1', 'box')}>
            Box
            {this.props.debuginfo}
          </button>
          <button className='dropdown-item' 
              onClick={() => this.props.setMode('add_1', 'ocr')} 
              href='.'>
            OCR
          </button>
        </div>
      </div>
    )
  }

  buildDeleteButton() {
    if (this.props.image_url === '') {
      return ''
    }
    return (
      <div id='delete_div' className='d-inline'>
        <button className='btn btn-primary dropdown-toggle ml-2' type='button' id='deleteDropdownButton'
            data-toggle='dropdown' aria-haspopup='true' aria-expanded='false'>
          Delete
        </button>
        <div className='dropdown-menu' aria-labelledby='deleteDropdownButton'>
          <button className='dropdown-item' 
              onClick={() => this.props.setMode('delete', 'item')} 
              href='.'>
            Item
          </button>
          <button className='dropdown-item' 
              onClick={() => this.props.setMode('delete_1', 'box_all')} 
              href='.'>
            Box (all in)
          </button>
        </div>
      </div>
    )
  }

  buildRedactButton() {
    if (this.props.image_url === '') {
      return ''
    }
    return (
      <button 
          className='btn btn-primary ml-2'  
          onClick={() => this.props.redactImage()}
          href='./index.html' >
        Redact
      </button>
    )
  }

  buildNewImageButton() {
    if (this.props.image_url === '') {
      return ''
    }
    return (
      <button 
          className='btn btn-primary ml-2'  
          onClick={() => this.props.newImage()}
          href='./index.html' >
        New
      </button>
    )
  }

  buildResetButton() {
    if (this.props.image_url === '') {
      return ''
    }
    return (
      <button 
          className='btn btn-primary ml-2' 
          onClick={() => this.doClearRedaction()}
          href='./index.html' >
        Reset
      </button>
    )
  }

  buildMessage() {
    if (this.props.message === '.') {
      let style = {
        color: '#FFFFFF',
      }
      return (
        <div 
          style={style}
        >
          {this.props.message}
        </div>
      )
    } else {
      return this.props.message
    }
  }

  buildDisplayMode() {
    if (this.props.display_mode=== '.') {
      let style = {
        color: '#FFFFFF',
      }
      return (
        <div 
          style={style}
        >
          {this.props.display_mode}
        </div>
      )
    } else {
      return this.props.display_mode
    }
  }

  illustrateShadedOvalOne() {
    this.props.setIllustrateShaded('true')
    this.props.setMode('illustrate', 'ill_oval_1')
  }

  illustrateShadedBoxOne() {
    this.props.setIllustrateShaded('true')
    this.props.setMode('illustrate', 'ill_box_1')
  }

  buildIllustrateButton() {
    if (this.props.image_url === '') {
      return ''
    }
    return (
      <div id='illustrate_div' className='d-inline'>
        <button className='btn btn-primary dropdown-toggle ml-2' type='button' id='illustrateDropdownButton'
            data-toggle='dropdown' aria-haspopup='true' aria-expanded='false'>
          Illustrate
        </button>
        <div className='dropdown-menu' aria-labelledby='illustrateDropdownButton'>
          <button className='dropdown-item' 
              onClick={() => this.props.setMode('illustrate', 'ill_oval_1')} 
              href='.'>
            Oval
          </button>
          <button className='dropdown-item' 
              onClick={() => this.illustrateShadedOvalOne()} 
              href='.'>
            Oval - shaded background
          </button>
          <button className='dropdown-item' 
              onClick={() => this.props.setMode('illustrate', 'ill_box_1')} 
              href='.'>
            Box
          </button>
          <button className='dropdown-item' 
              onClick={() => this.illustrateShadedBoxOne()} 
              href='.'>
            Box - shaded background
          </button>
        </div>
      </div>
    )
  }

  render() {
    const whenDoneLink = this.buildWhenDoneLink()
    const template_button = this.buildTemplateButton()
    const redacted_link = this.buildRedactedLink()
    const add_button = this.buildAddButton()
    const delete_button = this.buildDeleteButton()
    const redact_button = this.buildRedactButton()
    const reset_button = this.buildResetButton()
    const illustrate_button = this.buildIllustrateButton()
    const new_image_button = this.buildNewImageButton()
    const message = this.buildMessage()
    const display_mode = this.buildDisplayMode()

    return (
      <div className='mt-2' id='top_controls_div'>
        <div className='row'>
          <div className='col col-lg-1' />
          <div className='col col-lg-10'>

            {add_button}

            {delete_button} 

            {template_button}

            {illustrate_button}

            {new_image_button}

            {reset_button}
          
            {redact_button}

            {whenDoneLink}

            <div id='redacted_image_download_link' className='d-inline ml-2'>
              {redacted_link}
            </div>
          </div>
        </div>

        <div className='row d-flex justify-content-between'>
          <div className='col-lg-1' />
          <div id='mode_div' className='col-lg-2'>
            <div 
                id='mode_header' 
                className='h3'
            >
              {display_mode}
            </div>
          </div>
          <div id='message_divx' className='col-lg-9 mt-1 overflow-hidden'>
          </div>
        </div>

        <div className='row'>
          <div className='col-lg-1' />
          <div id='message_div' className='col-lg-10 h5'>
            {message}
          </div>
        </div>
      </div>
    );
  }
}

export default TopImageControls;
