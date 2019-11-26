import React from 'react';

class TopImageControls extends React.Component {
  constructor(props) {
    super(props)
    this.handleReset = this.handleReset.bind(this)
    this.handleRedact = this.handleRedact.bind(this)
  }

  handleReset() {
    this.props.clearRedactAreasCallback()
    this.props.setModeCallback('reset', '')
  }

  handleRedact() {
    this.props.doRedactCallback()
    this.props.setModeCallback('redact', '')
  }

  render() {
    let redacted_link = ''
    if (this.props.redacted_image_url) {
      let redacted_filename = this.props.redacted_image_url.split('/') 
      redacted_link = (
          <a 
              href={this.props.redacted_image_url}
              download={redacted_filename}
          >
            download 
          </a>
      )
    }
    let next_image_link = ''
    let next_image_url = this.props.getNextImageLink()
    if (next_image_url) {
      next_image_link = (
        <button
          className='btn btn-primary'
          onClick={() => this.props.setImageUrlCallback(next_image_url)}
        >
          Next
        </button>
      )
    }
    let prev_image_link = ''
    let prev_image_url = this.props.getPrevImageLink()
    if (prev_image_url) {
      prev_image_link = (
        <button
          className='btn btn-primary'
          onClick={() => this.props.setImageUrlCallback(prev_image_url)}
        >
          Prev
        </button>
      )
    }
    return (
      <div id='bottom_controls_div'>
        <div className='row'>
          <div id='add_div'>
            <button className='btn btn-primary dropdown-toggle' type='button' id='addDropdownButton'
                data-toggle='dropdown' aria-haspopup='true' aria-expanded='false'>
              Add
            </button>
            <div className='dropdown-menu' aria-labelledby='addDropdownButton'>
              <button className='dropdown-item' 
                  onClick={() => this.props.setModeCallback('add_1', 'box')}>
                Box
                {this.props.debuginfo}
              </button>
              <button className='dropdown-item' 
                  onClick={() => this.props.setModeCallback('add_1', 'ocr')} 
                  href='.'>
                OCR
              </button>
            </div>
          </div>

          <div id='delete_div'>
            <button className='btn btn-primary dropdown-toggle ml-2' type='button' id='deleteDropdownButton'
                data-toggle='dropdown' aria-haspopup='true' aria-expanded='false'>
              Delete
            </button>
            <div className='dropdown-menu' aria-labelledby='deleteDropdownButton'>
              <button className='dropdown-item' 
                  onClick={() => this.props.setModeCallback('delete', 'item')} 
                  href='.'>
                Item
              </button>
              <button className='dropdown-item' 
                  onClick={() => this.props.setModeCallback('delete_1', 'box_all')} 
                  href='.'>
                Box (all in)
              </button>
            </div>
          </div>

          <button 
              className='btn btn-primary ml-2' 
              onClick={() => this.props.setModeCallback('view', '')}
              href='./index.html' >
            Cancel
          </button>
          
          <button 
              className='btn btn-primary ml-2' 
              onClick={() => this.handleReset()}
              href='./index.html' >
            Reset
          </button>
        
          <div>
            <button 
                className='btn btn-primary ml-2'  
                onClick={() => this.handleRedact()}
                href='./index.html' >
              Redact
            </button>
          </div>

          <div className='col'>
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
          <div id='prev_image_div' className='d-inline ml-2'>
            {prev_image_link}
          </div>
          <div id='next_image_div' className='d-inline ml-2'>
            {next_image_link}
          </div>

        </div>
        <div className='row d-flex justify-content-between'>
          <div id='mode_div' className='col-md-2'>
            <h3 id='mode_header' >{this.props.display_mode}</h3>
          </div>
          <div id='message_div' className='pt-2 col-md-10'>
            <div 
                className='float-left'
                id='message'
            >
              {this.props.message? this.props.message : '.'}
            </div>
          </div>
        </div>
            {this.props.getImageAndHashDisplay()}
      </div>
    );
  }
}

export default TopImageControls;
