import React from 'react';

class BottomInsightsControls extends React.Component {

  render() {
    let bottom_y = 100
    const ele = document.getElementById('insights_image_div')
    if (ele) {
      bottom_y += ele.offsetHeight
    }
    const controls_style = {
      top: bottom_y,
    }
    return (
      <div 
          id='bottom_insights_controls' 
          className='fixed-bottom'
          style={controls_style}
      >
        <div className='row'>
          <div className='col'>
            <button
                className='btn btn-primary'
                onClick={() => this.props.setMode('add_roi_1')}
            >
              Add Template
            </button>
            <button
                className='btn btn-primary ml-5'
                onClick={() => this.props.clearRoiCallback()}
            >
              Reset Template
            </button>
            <button
                className='btn btn-primary ml-5'
                onClick={() => this.props.scanSubImage()}
            >
              Scan Template
            </button>
            <button
                className='btn btn-primary ml-5'
                onClick={() => this.props.clearSubImageMatches()}
            >
              Clear Template Matches
            </button>
          </div>
        </div>

        <div className='row mt-3'>
          <div className='col'>
            <button
                className='btn btn-primary'
                onClick={() => this.props.setMode('flood_fill_1')}
            >
              Flood Fill Select
            </button>
          </div>
          <div className='col ml-1'>
              <button
                  className='btn btn-primary'
                  onClick={() => this.props.setMode('arrow_fill_1')}
              >
                Arrow Fill Select
              </button>
          </div>
          <div className='col ml-1'>
              Tolerance
              <input 
                  id='fill_tolerance'
                  value=''
                  onChange={() => console.log('react forces me to put this stupid thing here')}
              />
          </div>
          <div className='col ml-1'>
            <button
                className='btn btn-primary ml-5'
                onClick={() => this.props.clearSelectedAreas()}
            >
              Clear Selected Areas
            </button>
          </div>
        </div>

        <div className='row mt-3'>
          <div className='col'>
            <input 
                id='match_on_text'
                value='match on text'
                onChange={() => console.log('react forces me to put this stupid thing here')}
            />
            <button
                className='btn btn-primary ml-5'
                onClick={() => console.log('rabid hedgehog')}
            >
              Scan Text
            </button>
            <button
                className='btn btn-primary ml-5'
                onClick={() => console.log('feisty bunny')}
            >
              Scan for OCR
            </button>
            <button
                className='btn btn-primary ml-5'
                onClick={() => console.log('fierce fruit bat')}
            >
              Scan for OCR
            </button>
          </div>
        </div>

      </div>
    )
  }
}

export default BottomInsightsControls;
