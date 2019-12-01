import React from 'react';

class TemplateControls extends React.Component {

  render() {
    return (
        <div className='row bg-light rounded'>
          <div className='col'>
            <div className='row'>
              <div 
                className='col-lg-9 h3'
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
                    onClick={() => this.props.setMode('add_template_anchor_1')}
                >
                  Add Anchor
                </button>
                <button
                    className='btn btn-primary ml-2 mt-2'
                    onClick={() => this.props.clearCurrentTemplateAnchor()}
                >
                  Clear Anchor
                </button>
                <button
                    className='btn btn-primary ml-2 mt-2'
                    onClick={() => this.props.setMode('add_template_mask_zone_1')}
                >
                  Add Mask Zone
                </button>
                <button
                    className='btn btn-primary ml-2 mt-2'
                    onClick={() => this.props.clearCurrentTemplateMaskZones()}
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

                <div className='d-inline'>
                  <button
                      className='btn btn-primary ml-2 mt-2 dropdown-toggle'
                      type='button'
                      id='scanTemplateDropdownButton'
                      data-toggle='dropdown'
                      area-haspopup='true'
                      area-expanded='false'
                  >
                    Run
                  </button>
                  <div className='dropdown-menu' aria-labelledby='scanTemplateDropdownButton'>
                    <button className='dropdown-item'
                        onClick={() => this.props.scanTemplate('image')}
                    >
                      Image
                    </button>
                    <button className='dropdown-item'
                        onClick={() => this.props.scanTemplate('movie')}
                    >
                      Movie 
                    </button>
                    <button className='dropdown-item'
                        onClick={() => this.props.scanTemplate('all_movies')}
                    >
                      All Movies
                    </button>
                    <button className='dropdown-item'
                        onClick={() => this.props.submitInsightsJob('current_template_current_movie')}
                    >
                      Movie as Job
                    </button>
                    <button className='dropdown-item'
                        onClick={() => this.props.submitInsightsJob('current_template_all_movies')}
                    >
                      All Movies as Job
                    </button>
                  </div>
                </div>

                <div className='d-inline'>
                  <button
                      className='btn btn-primary ml-2 mt-2 dropdown-toggle'
                      type='button'
                      id='deleteTemplateMatchDropdownButton'
                      data-toggle='dropdown'
                      area-haspopup='true'
                      area-expanded='false'
                  >
                    Clear Matches
                  </button>
                  <div className='dropdown-menu' aria-labelledby='deleteTemplateMatchDropdownButton'>
                    <button className='dropdown-item'
                        onClick={() => this.props.clearTemplateMatches('image')}
                    >
                      Image
                    </button>
                    <button className='dropdown-item'
                        onClick={() => this.props.clearTemplateMatches('movie')}
                    >
                      Movie
                    </button>
                    <button className='dropdown-item'
                        onClick={() => this.props.clearTemplateMatches('all_movies')}
                    >
                      All Movies
                    </button>
                    <button className='dropdown-item'
                        onClick={() => this.props.clearTemplateMatches('all_templates')}
                    >
                      All Templates
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
                        id='template_hist_percent'
                        size='10'
                        value='Hist %'
                        onChange={() => console.log('setting histogram percent')}
                    />
                </div>

                <div
                    className='d-inline ml-2 mt-2'
                >   
                    <input 
                        id='template_match_percent'
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
                        value='Template name'
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

                <div className='d-inline ml-2'>
                  <select
                      name='template_match_method'
                      onChange={(event) => alert('template match method')}
                  >
                    <option value='all'>--Match Method--</option>
                    <option value='all'>Match All Anchors</option>
                    <option value='any'>Match Any Anchor</option>
                  </select>
                </div>

              </div>

            </div>
          </div>
        </div>
    )
  }
}

export default TemplateControls;
