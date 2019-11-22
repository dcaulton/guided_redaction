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
        <div className='row bg-light'>
          <div className='col'>
            <button
                className='btn btn-primary ml-5'
                onClick={() => alert('fun guy')}
            >
              Set Template
            </button>
            <button
                className='btn btn-primary ml-5'
                onClick={() => this.props.setMode('add_roi_1')}
            >
              Add Anchor
            </button>
            <button
                className='btn btn-primary ml-5'
                onClick={() => this.props.clearRoiCallback()}
            >
              Clear Anchor
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

        <div className='row mt-3 bg-light'>
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
                  size='3'
                  value=''
                  onChange={() => console.log('react forces me to put this stupid thing here')}
              />
          </div>
          <div className='col ml-1'>
              Offset from Template UL
              <input 
                  id='offset_from_template'
                  size='3'
                  value=''
                  onChange={() => console.log('react forces me to put this stupid thing here')}
              />
          </div>
          <div className='col ml-1'>
            <button
                className='btn btn-primary ml-5'
                onClick={() => this.props.clearSelectedAreas()}
            >
              Clear Image 
            </button>
          </div>
          <div className='col ml-1'>
            <button
                className='btn btn-primary ml-5'
                onClick={() => this.props.clearMovieSelectedAreas()}
            >
              Clear Movie
            </button>
          </div>
        </div>

        <div className='row mt-3 bg-light'>
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
          </div>
        </div>

        <div className='row mt-3 bg-light'>
          <div className='col'>
            <button
                className='btn btn-primary ml-5'
                onClick={() => this.props.doPing()}
            >
              Do Ping
            </button>
          </div>
        </div>

      </div>
    )
  }
}

export default BottomInsightsControls;
