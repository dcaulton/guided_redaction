import React from 'react';

class SelectedAreaControls extends React.Component {

  render() {
    if (!this.props.showSelectedArea) {                                             
      return([])                                                                
    }
    const anchor_names = this.props.getCurrentTemplateAnchorNames()

    const sam = this.props.getCurrentSelectedAreaMeta()
    const or_template_id = sam['origin_template_id']
    let anchor_options = []
    for (const [index, value] of anchor_names.entries()) {
        anchor_options.push(
            <option key={index} value={value} >{value}</option>
        )
    }
    anchor_options.push(
        <option key='9898' value=''>---Template Anchor---</option>
    )
    let offset_string = 'Offset (0, 0)'
    if (Object.keys(sam).includes('offset')) {
      offset_string = 'Offset (' + sam['offset'].toString() + ')'
    }

    return (
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
                  +/-
                </button>
              </div>
              <div>
                <div>
                  <input
                    className='mr-2 mt-3'
                    type='checkbox'
                    onChange={() => this.props.toggleShowSelectedArea()}
                  />
                </div>
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
                      onClick={() => this.props.handleSetMode('flood_fill_1')}
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
                          onClick={() => this.props.handleSetMode('arrow_fill_1')}
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
                          size='15'
                          value={offset_string}
                          onChange={() => console.log('selected area offset')}
                      />
                  </div>

                  <div className='d-inline ml-2 mt-2'>
                    <select
                        name='selected_area_mask_method'
                        onChange={(event) => alert(event.target.value)}
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
                        onChange={(event) => this.props.setSelectedAreaTemplateAnchor(event.target.value)}
                        value={or_template_id} 
                    >
                      {anchor_options}
                    </select>
                  </div>

                </div>

              </div>
            </div>
          </div>
        </div>
    )
  }
}

export default SelectedAreaControls;
