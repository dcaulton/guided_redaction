import React from 'react';
import TemplateControls from './TemplateControls'

class BottomInsightsControls extends React.Component {

  render() {
    const anchor_names = this.props.getCurrentTemplateAnchors()

    let anchor_options = []
    for (const [index, value] of anchor_names.entries()) {
        anchor_options.push(
            <option value={value}>{value}</option>
        )
    }

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

      <TemplateControls 
        setMode={this.props.setMode}
        clearCurrentTemplateAnchor={this.props.clearCurrentTemplateAnchor}
        clearCurrentTemplateMaskZones={this.props.clearCurrentTemplateMaskZones}
        scanTemplate={this.props.scanTemplate}
        submitInsightsJob={this.props.submitInsightsJob}
        clearTemplateMatches={this.props.clearTemplateMatches}
        changeMaskMethodCallback={this.props.changeMaskMethodCallback}
      />

        <div className='row bg-light rounded mt-3'>
          <div className='col'>
            <div className='row'>
              <div 
                className='col-lg-9 h3'
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
                        id='scanSelectedAreaDropdownButton'
                        data-toggle='dropdown'
                        area-haspopup='true'
                        area-expanded='false'
                    >
                      Run
                    </button>
                    <div className='dropdown-menu' aria-labelledby='scanSelectedAreaDropdownButton'>
                      <button className='dropdown-item'
                          onClick={() => alert('scan just this image')}
                      >
                        Image
                      </button>
                      <button className='dropdown-item'
                          onClick={() => alert('scan this movie')}
                      >
                        Movie
                      </button>
                      <button className='dropdown-item'
                          onClick={() => alert('scan all movies')}
                      >
                        All Movies
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
                          onClick={() => alert('clear selectd areas for just this image')}
                      >
                        Image
                      </button>
                      <button className='dropdown-item'
                          onClick={() => alert('clear selected areas for this movie')}
                      >
                        Movie
                      </button>
                      <button className='dropdown-item'
                          onClick={() => this.props.clearMovieSelectedAreas()}
                      >
                        All Movies
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
                          value='Offset (x,y)' 
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

                  <div className='d-inline ml-2 mt-2'>
                    <select
                        name='selected_area_origin_template_anchor'
                        onChange={(event) => alert('selected area mask origin template anchor')}
                    >
                      <option value='default'>--Template Anchor--</option>
                      {anchor_options}
                    </select>
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
                className='col-lg-9 h3'
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
                
                  <div
                      className='d-inline ml-2 mt-2'
                  >   
                      <input 
                          id='ocr_match_on_text'
                          size='30'
                          value='match on text' 
                          onChange={() => console.log('match on text')}
                      />
                  </div>

                  <div
                      className='d-inline ml-2 mt-2'
                  >   
                      <input 
                          id='ocr_similarity'
                          size='10'
                          value='Similarity %' 
                          onChange={() => console.log('OCR similarity %')}
                      />
                  </div>

                  <div className='d-inline'>
                    <button
                        className='btn btn-primary ml-2 mt-2 dropdown-toggle'
                        type='button'
                        id='scanOcrDropdownButton'
                        data-toggle='dropdown'
                        area-haspopup='true'
                        area-expanded='false'
                    >
                      Run
                    </button>
                    <div className='dropdown-menu' aria-labelledby='scanOcrDropdownButton'>
                      <button className='dropdown-item'
                          onClick={() => alert('scan just this image')}
                      >
                        Image
                      </button>
                      <button className='dropdown-item'
                          onClick={() => alert('scan just this movie')}
                      >
                        Movie
                      </button>
                      <button className='dropdown-item'
                          onClick={() => alert('scan all movies')}
                      >
                        All Movies
                      </button>
                    </div>
                  </div>

                  <div className='d-inline'>
                    <button
                        className='btn btn-primary ml-2 mt-2 dropdown-toggle'
                        type='button'
                        id='deleteOcrDropdownButton'
                        data-toggle='dropdown'
                        area-haspopup='true'
                        area-expanded='false'
                    >
                      Clear
                    </button>
                    <div className='dropdown-menu' aria-labelledby='deleteOcrDropdownButton'>
                      <button className='dropdown-item'
                          onClick={() => alert('clear OCR data for just this image')}
                      >
                        Image
                      </button>
                      <button className='dropdown-item'
                          onClick={() => alert('clear OCR data for all frames of this movie')}
                      >
                        Movie
                      </button>
                      <button className='dropdown-item'
                          onClick={() => alert('clear OCR data for all movies')}
                      >
                        All Movies
                      </button>
                    </div>
                  </div>

                </div>

              </div>
            </div>
          </div>
        </div>






        <div className='row mt-3 bg-light rounded mt-3'>
            <button
                className='btn btn-primary mt-2 ml-2'
                onClick={() => this.props.callPing()}
            >
              Ping
            </button>

            <button
                className='btn btn-primary mt-2 ml-2'
                onClick={() => this.props.getJobs()}
            >
              Get Jobs
            </button>

            <div className='d-inline'>
              <button
                  className='btn btn-primary ml-2 mt-2 dropdown-toggle'
                  type='button'
                  id='loadWorkbookDropdownButton'
                  data-toggle='dropdown'
                  area-haspopup='true'
                  area-expanded='false'
              >
                Load Workbook
              </button>
              <div className='dropdown-menu' aria-labelledby='loadWorkbookDropdownButton'>
                <button className='dropdown-item'
                    onClick={() => alert('load session 1')}
                >
                  SESSION 1
                </button>
                <button className='dropdown-item'
                    onClick={() => alert('load mobile stuff')}
                >
                  MOBILE STUFF SMALL
                </button>
                <button className='dropdown-item'
                    onClick={() => alert('gradients')}
                >
                  Gradients
                </button>
              </div>
            </div>

            <button
                className='btn btn-primary mt-2 ml-2'
                onClick={() => alert('save')}
            >
              Save Workbook
            </button>

        </div>

      </div>
    )
  }
}

export default BottomInsightsControls;
