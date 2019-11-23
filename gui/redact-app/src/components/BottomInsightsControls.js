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

                <div 
                    className='d-inline'
                >
                  <button
                      className='btn btn-primary ml-2 mt-2 dropdown-toggle'
                      type='button'
                      id='setActiveTemplateDropdownButton'
                      data-toggle='dropdown'
                      area-haspopup='true'
                      area-expanded='false'
                  >
                    Set Active
                  </button>
                  <div className='dropdown-menu' aria-labelledby='setActiveTemplateDropdownButton'>
                    <button className='dropdown-item'
                        onClick={() => alert('template 1 is active')}
                    >
                      Template 1
                    </button>
                    <button className='dropdown-item'
                        onClick={() => alert('that other template is active')}
                    >
                      That other template
                    </button>
                  </div>
                </div>

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
                  Add Mask Zone
                </button>
                <button
                    className='btn btn-primary ml-2 mt-2'
                    onClick={() => alert('clear template zones')}
                >
                  Clear Zones
                </button>

                <div 
                    className='d-inline'
                >
                  <button
                      className='btn btn-primary ml-2 mt-2 dropdown-toggle'
                      type='button'
                      id='deleteTemplateDropdownButton'
                      data-toggle='dropdown'
                      area-haspopup='true'
                      area-expanded='false'
                  >
                    Delete
                  </button>
                  <div className='dropdown-menu' aria-labelledby='deleteTemplateDropdownButton'>
                    <button className='dropdown-item'
                        onClick={() => alert('delete template 1')}
                    >
                      Template 1
                    </button>
                    <button className='dropdown-item'
                        onClick={() => alert('delete that other template')}
                    >
                      That other template
                    </button>
                  </div>
                </div>

                <div className='d-inline ml-2'>
                  <select
                      name='template_scale'
                      onChange={(event) => alert(event.target.value)}
                  >
                    <option value='1_1'>--Scale--</option>
                    <option value='1_1'>1:1</option>
                    <option value='1_5'>+/- 5%</option>
                  </select>
                </div>

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

                <div className='d-inline ml-2'>
                  <select
                      name='template_mask_method'
                      onChange={(event) => this.props.changeMaskMethodCallback(event.target.value)}
                  >
                    <option value='blur_7x7'>--Mask Method--</option>
                    <option value='blur_7x7'>Gaussian Blur 7x7</option>
                    <option value='blur_21x21'>Gaussian Blur 21x21</option>
                    <option value='blur_median'>Median Blur</option>
                    <option value='black_rectangle'>Black Rectangle</option>
                  </select>
                </div>


                <div className='d-inline'>
                  <button
                      className='btn btn-primary ml-2 mt-2 dropdown-toggle'
                      type='button'
                      id='scanTemplateDropdownButton'
                      data-toggle='dropdown'
                      area-haspopup='true'
                      area-expanded='false'
                  >
                    Scan
                  </button>
                  <div className='dropdown-menu' aria-labelledby='scanTemplateDropdownButton'>
                    <button className='dropdown-item'
                        onClick={() => alert('scan just this movie')}
                    >
                      Movie
                    </button>
                    <button className='dropdown-item'
                        onClick={() => this.props.scanSubImage()}
                    >
                      All Movies
                    </button>
                  </div>
                </div>

                <button
                    className='btn btn-primary ml-2 mt-2 mb-2'
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
                  <button
                      className='btn btn-primary ml-2 mt-2'
                      onClick={() => this.props.setMode('flood_fill_1')}
                  >
                    Flood Fill
                  </button>

                  <div className='d-inline'>
                    <button
                        className='btn btn-primary ml-2 mt-2 dropdown-toggle'
                        type='button'
                        id='arrowFillDropdownButton'
                        data-toggle='dropdown'
                        area-haspopup='true'
                        area-expanded='false'
                    >
                      Arrow Fill
                    </button>
                    <div className='dropdown-menu' aria-labelledby='arrowFillDropdownButton'>
                      <button className='dropdown-item'
                          onClick={() => this.props.setMode('arrow_fill_1')}
                      >
                        Simple
                      </button>
                      <button className='dropdown-item'
                          onClick={() => alert('arrow fill chain')}
                      >
                        Chain
                      </button>
                    </div>
                  </div>

                  <div
                      className='d-inline ml-2 mt-2'
                  >   
                      <input 
                          id='selected_area_tolerance'
                          size='10'
                          value='Tolerance %'
                          onChange={() => console.log('selected area tolerance')}
                      />
                  </div>

                  <div
                      className='d-inline ml-2 mt-2'
                  >   
                      <input 
                          id='selected_area_offset'
                          size='10'
                          value='Origin (x,y)' 
                          onChange={() => console.log('selected area offset')}
                      />
                  </div>

                  <div className='d-inline ml-2 mt-2'>
                    <select
                        name='selected_area_mask_method'
                        onChange={(event) => this.props.changeMaskMethodCallback(event.target.value)}
                    >
                      <option value='blur_7x7'>--Mask Method--</option>
                      <option value='blur_7x7'>Gaussian Blur 7x7</option>
                      <option value='blur_21x21'>Gaussian Blur 21x21</option>
                      <option value='blur_median'>Median Blur</option>
                      <option value='black_rectangle'>Black Rectangle</option>
                    </select>
                  </div>

                  <div className='d-inline'>
                    <button
                        className='btn btn-primary ml-2 mt-2 dropdown-toggle'
                        type='button'
                        id='selectedAreaMaskDropdownButton'
                        data-toggle='dropdown'
                        area-haspopup='true'
                        area-expanded='false'
                    >
                      Mask
                    </button>
                    <div className='dropdown-menu' aria-labelledby='selectedAreaMaskDropdownButton'>
                      <button className='dropdown-item'
                          onClick={() => alert('no mask (default)')}
                      >
                        None
                      </button>
                      <button className='dropdown-item'
                          onClick={() => alert('mask everything outside the selected area')}
                      >
                        Exterior
                      </button>
                      <button className='dropdown-item'
                          onClick={() => alert('mask everything inside the selected area')}
                      >
                        Interior
                      </button>
                    </div>
                  </div>

                  <div className='d-inline'>
                    <button
                        className='btn btn-primary ml-2 mt-2 dropdown-toggle'
                        type='button'
                        id='deleteSelectedAreaDropdownButton'
                        data-toggle='dropdown'
                        area-haspopup='true'
                        area-expanded='false'
                    >
                      Clear
                    </button>
                    <div className='dropdown-menu' aria-labelledby='deleteSelectedAreaDropdownButton'>
                      <button className='dropdown-item'
                          onClick={() => alert('clear selected areas for just this image')}
                      >
                        Image
                      </button>
                      <button className='dropdown-item'
                          onClick={() => this.props.clearMovieSelectedAreas()}
                      >
                        Movie
                      </button>
                    </div>
                  </div>

                </div>

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
                ocr
              </div>
              <div className='col float-right'>
                <button
                    className='btn btn-link'
                    aria-expanded='false'
                    data-target='#ocr_body'
                    aria-controls='ocr_body'
                    data-toggle='collapse'
                    type='button'
                >
                  show/hide
                </button>
              </div>
            </div>

            <div 
                id='ocr_body' 
                className='row collapse'
            >
              <div id='ocr_main' className='col'>

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

              </div>
            </div>
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
