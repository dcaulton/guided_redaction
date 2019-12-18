import React from 'react';

class TemplateControls extends React.Component {

  constructor(props) {
    super(props)
    this.state = {
      template_name: 'template 1',
      template_scale: '1_1',
      template_histogram_percent: 'Hist %',
      template_match_percent: 'Match %',
      template_mask_method: '',
      template_match_method: '',
    }
  }

  buildTemplatePickerButton() {                                                 
    let return_array = []                                                       
		const template_keys = Object.keys(this.props.templates)
    return_array.push(                                                        
      <div key='x34' className='d-inline'>
      <button
          key='temp_names_button'
          className='btn btn-primary ml-2 mt-2 dropdown-toggle'
          type='button'
          id='loadTemplateDropdownButton'
          data-toggle='dropdown'
          area-haspopup='true'
          area-expanded='false'
      >
        Load Template
      </button>
      <div className='dropdown-menu' aria-labelledby='loadTemplateDropdownButton'>
    {template_keys.map((value, index) => {
      return (
        <button
            className='dropdown-item'
            key={index}
            onClick={() => this.doTemplateLoad(this.props.templates[value]['id'])}
        >
          {this.props.templates[value]['name']}
        </button>
      )
    })}
        <button
            className='dropdown-item'
            key='000'
            onClick={() => this.loadNewTemplate()}
        >
          new
        </button>
      </div>
      </div>
    )
    return return_array                                                         
  } 

  loadNewTemplate() {
    this.props.setCurrentTemplate('')
    this.doSleep(500).then(() => {
      this.setState({
        template_name: 'template 1',
        template_scale: '1_1',
        template_histogram_percent: 'Hist %',
        template_match_percent: 'Match %',
        template_mask_method: '',
        template_match_method: '',
      })
    })
  }

  doTemplateLoad(template_id) {
    this.props.loadTemplate(template_id, this.props.displayTemplateLoadedMessage)
    const template = this.props.templates[template_id]
    this.setState({
      template_name: template.name,
      template_scale: template.scale,
      template_histogram_percent: template.histogram_percent, 
      template_match_percent: template.match_percent,
      template_mask_method: template.mask_method,
      template_match_method: template.match_method,
    })
  }

  doSleep(milliseconds) {
    return new Promise(resolve => setTimeout(resolve, milliseconds))
  }

  setTemplateName(the_name) {
    this.setState({
      template_name: the_name,
    })
    // I need to do this because setting it as the after clause on setState doesn't pick up the latest state
    this.doSleep(500).then(() => {this.doTemplateSave(this.props.displayTemplateSavedMessage)})
  }

  setTemplateScale(value) {
    this.setState({
      template_scale: value,
    })
    this.doSleep(500).then(() => {this.doTemplateSave(this.props.displayTemplateSavedMessage)})
  }

  setTemplateHistogramPercent(value) {
    this.setState({
      template_histogram_percent: value,
    })
    this.doSleep(500).then(() => {this.doTemplateSave(this.props.displayTemplateSavedMessage)})
  }

  setTemplateMatchPercent(value) {
    this.setState({
      template_match_percent: value,
    })
    this.doSleep(500).then(() => {this.doTemplateSave(this.props.displayTemplateSavedMessage)})
  }

  setTemplateMaskMethod(value) {
    this.setState({
      template_mask_method: value,
    })
    this.doSleep(500).then(() => {this.doTemplateSave(this.props.displayTemplateSavedMessage)})
  }

  setTemplateMatchMethod(value) {
    this.setState({
      template_match_method: value,
    })
    this.doSleep(500).then(() => {this.doTemplateSave(this.props.displayTemplateSavedMessage)})
  }

  buildTemplateDeleteButton() {
    let return_array = []
		const template_keys = Object.keys(this.props.templates)
    return_array.push(
      <div key='ls225' className='d-inline'>
      <button
          key='temp_delete_button'
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
    {template_keys.map((value, index) => {
      return (
        <button
            className='dropdown-item'
            key={index}
            onClick={() => this.props.deleteTemplate(this.props.templates[value]['id'], this.props.displayTemplateDeletedMessage)}
        >
          {this.props.templates[value]['name']}
        </button>
      )
    })}
      </div>
      </div>
    )
    return return_array
  }

  doAddTemplateAnchor() {
    this.doTemplateSave(() => {})
    this.props.setMode('add_template_anchor_1')
  }

  doAddTemplateMaskZone() {
    this.doTemplateSave(() => {})
    this.props.setMode('add_template_mask_zone_1')
  }

  doTemplateSave(when_done) {
    let template_data = {
      id: this.props.current_template_id,
      name: this.state.template_name,
      scale: this.state.template_scale,
      histogram_percent: this.state.template_histogram_percent,
      match_percent: this.state.template_match_percent,
      mask_method: this.state.template_mask_method,
      match_method: this.state.template_match_method,
    }
    this.props.saveTemplate(template_data, when_done)
  }

  render() {
    let template_saved_unsaved = ''
    if (!this.props.current_template_id) {
      template_saved_unsaved = <span>(unsaved)</span>
    }
    const template_load_button = this.buildTemplatePickerButton()
    const template_delete_button = this.buildTemplateDeleteButton()

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
                <div 
                    className='d-inline'
                >
                  {template_load_button}
                </div>

                <button
                    className='btn btn-primary ml-2 mt-2'
                    onClick={() => this.doAddTemplateAnchor()}
                >
                  Add Anchor
                </button>

                <button
                    className='btn btn-primary ml-2 mt-2'
                    onClick={() => this.props.clearCurrentTemplateAnchor()}
                >
                  Clear Anchors
                </button>

                <button
                    className='btn btn-primary ml-2 mt-2'
                    onClick={() => this.doAddTemplateMaskZone()}
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
                  {template_delete_button}
                </div>

                <div 
                    className='d-inline'
                >
									<button
											className='btn btn-primary ml-2 mt-2'
											onClick={() => this.doTemplateSave(this.props.displayTemplateSavedMessage)}
									>
										Save
									</button>
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
                      onChange={(event) => this.setTemplateScale(event.target.value)}
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
                        value={this.state.template_histogram_percent}
                        onChange={(event) => this.setTemplateHistogramPercent(event.target.value)}
                    />
                </div>

                <div
                    className='d-inline ml-2 mt-2'
                >   
                    <input 
                        id='template_match_percent'
                        size='10'
                        value={this.state.template_match_percent}
                        onChange={(event) => this.setTemplateMatchPercent(event.target.value)}
                    />
                </div>

                <div
                    className='d-inline ml-2 mt-2'
                >   
                    <input                                                      
                        id='template_name'                                      
                        key='template_name_1'                                   
                        size='25'                                               
                        value={this.state.template_name}
                        onChange={(event) => this.setTemplateName(event.target.value)}
                    /> 
                    {template_saved_unsaved}
                </div>

                <div className='d-inline ml-2'>
                  <select
                      name='template_mask_method'
                      onChange={(event) => this.setTemplateMaskMethod(event.target.value)}
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
                      onChange={(event) => this.setTemplateMatchMethod(event.target.value)}
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
