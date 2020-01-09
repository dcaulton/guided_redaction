import React from 'react';

class TopImageControls extends React.Component {
  doClearRedaction() {
    this.props.clearCurrentFramesetRedactions(this.props.setMessage('image redactions reset'))
  }

  buildWhenDoneLink() {
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

  render() {
    const whenDoneLink = this.buildWhenDoneLink()
    const template_button = this.buildTemplateButton()
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
    return (
      <div className='m-2' id='top_controls_div'>
        <div className='row'>
          <div className='col col-lg-1'>
          </div>
          <div className='col col-lg-10'>
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

            {template_button}

            <button 
                className='btn btn-primary ml-2' 
                onClick={() => this.props.setMode('view', '')}
                href='./index.html' >
              Cancel
            </button>
            
            <button 
                className='btn btn-primary ml-2' 
                onClick={() => this.doClearRedaction()}
                href='./index.html' >
              Reset
            </button>
          
            <button 
                className='btn btn-primary ml-2'  
                onClick={() => this.props.redactImage()}
                href='./index.html' >
              Redact
            </button>

            {whenDoneLink}
            <div className='d-inline ml-2'>
              <select 
                  name='mask_method'
                  onChange={(event) => this.props.changeMaskMethodCallback(event.target.value)}
              >
                <option value='blur_7x7'>--- Mask Method ---</option>
                <option value='blur_7x7'>Gaussian Blur 7x7</option>
                <option value='blur_21x21'>Gaussian Blur 21x21</option>
                <option value='blur_median'>Median Blur</option>
                <option value='black_rectangle'>Black Rectangle</option>
                <option value='green_outline'>Green Outline</option>
              </select>
            </div>

            <div id='redacted_image_download_link' className='d-inline ml-2'>
              {redacted_link}
            </div>
          </div>
        </div>

        <div className='row d-flex justify-content-between'>
          <div className='col-lg-1' />
          <div id='mode_div' className='col-lg-2'>
            <h3 id='mode_header' >{this.props.display_mode}</h3>
          </div>
          <div id='message_div' className='col-lg-9 mt-1 overflow-hidden'>
            <div 
                className='float-left'
                id='message'
            >
              {this.props.message}
            </div>
          </div>
        </div>
        <div className='row'>
          <div className='col-lg-1' />
          <div className='col-lg-10'>
            {this.props.getImageAndHashDisplay()}
          </div>
        </div>
      </div>
    );
  }
}

export default TopImageControls;
