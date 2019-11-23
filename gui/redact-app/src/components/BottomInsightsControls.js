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



        <div className='row bg-light rounded'>
          <div className='col'>
            <div className='row'>
              <div 
                className='col-lg-10 h3'
              > 
                templates
              </div>
              <div className='col float-right'>
                <button
                    className='btn btn-link'
                    aria-expanded='false'
                    data-target='#template_controls_body'
                    aria-controls='template_controls_body'
                    data-toggle='collapse'
                    type='button'
                >
                  show/hide
                </button>
              </div>
            </div>

            <div 
                id='template_controls_body' 
                className='row collapse'
            >
              <div id='template_controls_main' className='col'>
                <button
                    className='btn btn-primary ml-2 mt-2'
                    onClick={() => alert('new template')}
                >
                  New
                </button>
                <button
                    className='btn btn-primary ml-2 mt-2'
                    onClick={() => alert('set active template')}
                >
                  Set Active
                </button>
                <button
                    className='btn btn-primary ml-2 mt-2'
                    onClick={() => this.props.setMode('add_roi_1')}
                >
                  Add Anchor
                </button>
                <button
                    className='btn btn-primary ml-2 mt-2'
                    onClick={() => this.props.clearRoiCallback()}
                >
                  Clear Anchor
                </button>
                <button
                    className='btn btn-primary ml-2 mt-2'
                    onClick={() => alert('add template zone')}
                >
                  Add Zone
                </button>
                <button
                    className='btn btn-primary ml-2 mt-2'
                    onClick={() => alert('clear template zones')}
                >
                  Clear Zones
                </button>
                <button
                    className='btn btn-primary ml-2 mt-2'
                    onClick={() => alert('delete template')}
                >
                  Delete
                </button>
                <button
                    className='btn btn-primary ml-2 mt-2'
                    onClick={() => alert('set template scale')}
                >
                  Scale
                </button>

                <div
                    className='d-inline ml-2 mt-2'
                >   
                    <input 
                        id='template_name'
                        size='10'
                        value='Hist %'
                        onChange={() => console.log('setting histogram percent')}
                    />
                </div>

                <div
                    className='d-inline ml-2 mt-2'
                >   
                    <input 
                        id='template_name'
                        size='10'
                        value='Match %'
                        onChange={() => console.log('setting template match percent')}
                    />
                </div>

                <div
                    className='d-inline ml-2 mt-2'
                >   
                    <input 
                        id='template_name'
                        size='25'
                        value='Template Name'
                        onChange={() => console.log('setting template name')}
                    />
                </div>

                <button
                    className='btn btn-primary ml-2 mt-2'
                    onClick={() => alert('template mask style')}
                >
                  Mask Style
                </button>

                <button
                    className='btn btn-primary ml-2 mt-2'
                    onClick={() => this.props.scanSubImage()}
                >
                  Scan Template
                </button>
                <button
                    className='btn btn-primary ml-2 mt-2'
                    onClick={() => this.props.clearSubImageMatches()}
                >
                  Clear
                </button>
              </div>

            </div>
          </div>
        </div>



        <div className='row bg-light rounded mt-3'>
          <div className='col'>
            <div className='row'>
              <div 
                className='col-lg-10 h3'
              > 
                selected area
              </div>
              <div className='col float-right'>
                <button
                    className='btn btn-link'
                    aria-expanded='false'
                    data-target='#selected_area_body'
                    aria-controls='selected_area_body'
                    data-toggle='collapse'
                    type='button'
                >
                  show/hide
                </button>
              </div>
            </div>

            <div 
                id='selected_area_body' 
                className='row collapse'
            >
              <div id='selected_area_main' className='col'>

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
              </div>
            </div>
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
