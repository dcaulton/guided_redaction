import React from 'react';

class TopControls extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    return (
      <div id='bottom_controls_div'>
        <div className='row'>
          <div className='col-md-1' />
          <div className='col' id='add_div'>
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
{/*
              <button className='dropdown-item' 
                  onClick={() => this.props.setModeCallback('ADD', 'flood')} 
                  href='.'>
                Flood
              </button>
              <button className='dropdown-item' 
                  onClick={() => this.props.setModeCallback('ADD', 'polyline')} 
                  href='.'>
                Polyline
              </button>
*/}
            </div>
          </div>
          <div className='col' id='delete_div'>
            <button className='btn btn-primary dropdown-toggle' type='button' id='deleteDropdownButton'
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
{/*
              <button className='dropdown-item' 
                  onClick={() => this.props.setModeCallback('DELETE', 'box_part')} 
                  href='.'>
                Box (part in)
              </button>
*/}
            </div>
          </div>
          <div className='col'>
            <button 
                className='btn btn-primary' 
                onClick={() => this.props.setModeCallback('view', '')}
                href='./index.html' >
              Cancel
            </button>
          </div>
          <div className='col'>
            <button 
                className='btn btn-primary' 
                onClick={() => this.props.setModeCallback('reset', '')}
                href='./index.html' >
              Reset Image
            </button>
          </div>
          <div className='col'>
            <button 
                className='btn btn-primary'  
                onClick={() => this.props.setModeCallback('redact', '')}
                href='./index.html' >
              Redact
            </button>
          </div>
          <div className='col marquee_div'>
            <span>hiya</span>
          </div>
        </div>
        <div className='row d-flex justify-content-between'>
          <div id='mode_div' className='col-md-4'>
            <h3 id='mode_header' >{this.props.display_mode}</h3>
          </div>
          <div id='message_div' className='pt-2 col-md-8'>
            <span id='message'>{this.props.message}</span>
          </div>
        </div>
      </div>
    );
  }
}

export default TopControls;
