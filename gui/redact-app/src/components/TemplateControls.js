import React from 'react';

class TemplateControls extends React.Component {

  constructor(props) {
    super(props)
    this.state = {
      template_name: 'template 1',
      app_name: '',
      template_scale: '1_1',
      template_match_percent: 90,
      template_match_method: 'any',
      template_download_link: '',
    }
    this.afterTemplateLoaded=this.afterTemplateLoaded.bind(this)
    this.anchorSliceDone=this.anchorSliceDone.bind(this)
  }

  importTemplate(files) {
    var app_this = this
    let reader = new FileReader()
    reader.onload = (function(evt) {
      let template = JSON.parse(evt.target.result)
      if (template['id']) {
        app_this.props.saveTemplate(
          template, 
          app_this.props.displayInsightsMessage('Template has been loaded'),
          template['anchors'],
          template['mask_zones']
        )
      }
    })
    reader.readAsBinaryString(files[0]);
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
    this.props.setCurrentTemplateId('')
    this.doSleep(200).then(() => {
      this.setState({
        template_name: 'template 1',
        app_name: '',
        template_scale: '1_1',
        template_match_percent: 90,
        template_match_method: 'any',
        template_download_link: '',
      })
    })
  }

  setLocalTemplateVarsFromTemplateId(template_id) {
    const template = this.props.templates[template_id]
    this.setState({
      template_name: template.name,
      app_name: template.app_name,
      template_scale: template.scale,
      template_match_percent: template.match_percent,
      template_match_method: template.match_method,
      template_download_link: '',
    })
  }

  doTemplateLoad(template_id) {
    this.props.setCurrentTemplateId(
      template_id, 
      this.afterTemplateLoaded()
    )
  }

  anchorSliceDone(response) {
    if (this.props.current_template_id) {
      let cur_template = this.props.templates[this.props.current_template_id]
      let new_anchors = []
      for (let i=0; i < cur_template['anchors'].length; i++) {
        let anchor = cur_template['anchors'][i]
        if (anchor['id'] === response['anchor_id']) {
          anchor['image_bytes_png_base64'] = response['cropped_image_bytes']
        }
        new_anchors.push(anchor)
      }
      cur_template['anchors'] = new_anchors

      let dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(cur_template))
      this.setState({
        template_download_link: dataStr,
      })
      this.props.displayInsightsMessage('Template download link has been created')
    }
  }

  doTemplateExport() {
    if (this.props.current_template_id) {
      let cur_template = this.props.templates[this.props.current_template_id]
      for (let i=0; i < cur_template['anchors'].length; i++) {
        let the_anchor = cur_template['anchors'][i]
        this.props.cropImage(
          the_anchor['image'], 
          the_anchor['start'], 
          the_anchor['end'], 
          the_anchor['id'], 
          this.anchorSliceDone
        )
      }
    }
  }

  afterTemplateLoaded() {
    this.props.displayInsightsMessage('Template has been loaded')
    this.doSleep(200).then(() => {
      this.setLocalTemplateVarsFromTemplateId(this.props.current_template_id)
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
    this.doSleep(200).then(() => {
      this.doTemplateSave(this.props.displayInsightsMessage('Template has been saved'))
    })
  }

  setTemplateAppName(the_name) {
    this.setState({
      app_name: the_name,
    })
    // I need to do this because setting it as the after clause on setState doesn't pick up the latest state
    this.doSleep(200).then(() => {
      this.doTemplateSave(this.props.displayInsightsMessage('Template has been saved'))
    })
  }

  setTemplateScale(value) {
    this.setState({
      template_scale: value,
    })
    this.doSleep(200).then(() => {
      this.doTemplateSave(this.props.displayInsightsMessage('Template has been saved'))
    })
  }

  setTemplateMatchPercent(value) {
    this.setState({
      template_match_percent: value,
    })
    this.doSleep(200).then(() => {
      this.doTemplateSave(this.props.displayInsightsMessage('Template has been saved'))
    })
  }

  setTemplateMatchMethod(value) {
    this.setState({
      template_match_method: value,
    })
    this.doSleep(200).then(() => {
      this.doTemplateSave(this.props.displayInsightsMessage('Template has been saved'))
    })
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
            onClick={() => 
              this.props.deleteTemplate(
                this.props.templates[value]['id'], 
                this.props.displayInsightsMessage('Template has been deleted')
              )
            }
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
    this.props.handleSetMode('add_template_anchor_1')
  }

  doAddTemplateMaskZone() {
    this.doTemplateSave(() => {})
    this.props.handleSetMode('add_template_mask_zone_1')
  }

  doTemplateSave(when_done) {
    let template_data = {
      id: this.props.current_template_id,
      name: this.state.template_name,
      app_name: this.state.app_name,
      scale: this.state.template_scale,
      match_percent: this.state.template_match_percent,
      match_method: this.state.template_match_method,
    }
    this.props.saveTemplate(template_data, when_done)
  }

  buildTemplateDownloadButton() {
    let dl_button = ''
    if (this.state.template_download_link) {
      let dl_name = this.state.template_name + '.json'
      dl_button = (
        <a 
          href={this.state.template_download_link}
          download={dl_name}
        >
        download
        </a>
      )
    }
    return dl_button
  }

  buildAnchorPics() {
    let return_arr = []
    if (this.props.current_template_id) {
      return_arr.push(<span key='992234'>Embedded Anchors: </span>)
      let cur_template = this.props.templates[this.props.current_template_id]
      let anchor_ids = Object.keys(cur_template['anchors'])
      for (let i=0; i < anchor_ids.length; i++) {
        const anchor = cur_template['anchors'][anchor_ids[i]]
        if (anchor['image_bytes_png_base64']) {
          const b64img = anchor['image_bytes_png_base64']
          let the_src='https://www.thewholesomedish.com/wp-content/uploads/2019/06/THE-BEST-CLASSIC-TACOS-600X900.jpg'
          the_src = "data:image/gif;base64," + b64img
          return_arr.push(
            <div 
              key={'hey' + i}
              className='p-2 border-bottom'
            >
              <div className='d-inline'>
                <div className='d-inline'>
                  Anchor id: 
                </div>
                <div className='d-inline ml-2'>
                  {anchor['id']}
                </div>
              </div>
              <div className='d-inline ml-2'>
                <img 
                  max-height='100'
                  max-width='100'
                  key={'dapper' + i}
                  alt={anchor['id']}
                  title={anchor['id']}
                  src={the_src}
                />
              </div>
            </div>
          )
        }
      }
    }
    return return_arr
  }

  buildTemplateRunButton() {
    let movie_set_keys = Object.keys(this.props.movie_sets)
    return (
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
              onClick={() => this.props.submitInsightsJob('current_template_current_movie')}
          >
            Movie
          </button>
          <button className='dropdown-item'
              onClick={() => this.props.submitInsightsJob('current_template_all_movies')}
          >
            All Movies
          </button>
    {movie_set_keys.map((value, index) => {
      return (
        <button
            className='dropdown-item'
            key={index}
            onClick={() => this.props.submitInsightsJob('current_template_movie_set', value)}
        >
          MovieSet '{this.props.movie_sets[value]['name']}' as Job
        </button>
      )
    })}
        </div>
      </div>
    )
  }

  render() {
    if (!this.props.visibilityFlags['templates']) {                                             
      return([])                                                                
    }

    let template_saved_unsaved = ''
    if (!this.props.current_template_id) {
      template_saved_unsaved = <span>(unsaved)</span>
    }
    const template_load_button = this.buildTemplatePickerButton()
    const template_delete_button = this.buildTemplateDeleteButton()
    const template_download_button = this.buildTemplateDownloadButton()
    const anchor_pics = this.buildAnchorPics()
    const run_button = this.buildTemplateRunButton()

    return (
        <div className='row bg-light rounded'>
          <div className='col'>
            <div className='row'>
              <div 
                className='col-lg-10 h3'
              > 
                templates
              </div>
              <div className='col-lg-1 float-right'>
                <button
                    className='btn btn-link'
                    aria-expanded='false'
                    data-target='#template_controls_body'
                    aria-controls='template_controls_body'
                    data-toggle='collapse'
                    type='button'
                >
                  +/-
                </button>
              </div>

              <div className='col-lg-1'>
                <div>
                  <input
                    className='mr-2 mt-3'
                    type='checkbox'
                    onChange={() => this.props.toggleShowVisibility('templates')}
                  />
                </div>
              </div>
            </div>

            <div 
                id='template_controls_body' 
                className='row collapse'
            >
              <div id='template_controls_main' className='col'>

                <div className='row'>
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
                        onClick={() => 
                          this.doTemplateSave(
                            this.props.displayInsightsMessage('Template has been saved')
                          )
                        }
                    >
                      Save
                    </button>
                  </div>

                  <div className='d-inline'>
                    {run_button}
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
                </div>



                <div className='row mt-2'>
                  <div className='d-inline ml-2'>
                    Scale
                  </div>
                  <div className='d-inline ml-2'>
                    <select
                        name='template_scale'
                        value={this.props.template_scale}
                        onChange={(event) => this.setTemplateScale(event.target.value)}
                    >
                      <option value='1:1'>actual image scale only</option>
                      <option value='+/-10/1'>+/- 10%, 1% increments</option>
                      <option value='+/-20/1'>+/- 20%, 1% increments</option>
                      <option value='+/-20/5'>+/- 20%, 5% increments</option>
                      <option value='+/-25/1'>+/- 25%, 1% increments</option>
                      <option value='+/-25/5'>+/- 25%, 5% increments</option>
                      <option value='+/-40/5'>+/- 40%, 5% increments</option>
                      <option value='+/-50/5'>+/- 50%, 5% increments</option>
                    </select>
                  </div>
                </div>


                <div className='row mt-2'>
                  <div className='d-inline ml-2'>
                    Match Percent
                  </div>
                  <div
                      className='d-inline ml-2'
                  >   
                      <input 
                          id='template_match_percent'
                          size='4'
                          title='template match percent'
                          value={this.state.template_match_percent}
                          onChange={(event) => this.setTemplateMatchPercent(event.target.value)}
                      />
                  </div>
                </div>


                <div className='row mt-2'>
                  <div className='d-inline ml-2'>
                    Match Method
                  </div>
                  <div className='d-inline ml-2'>
                    <select
                        name='template_match_method'
                        value={this.state.template_match_method}
                        onChange={(event) => this.setTemplateMatchMethod(event.target.value)}
                    >
                      <option value='all'>Match All Anchors</option>
                      <option value='any'>Match Any Anchor</option>
                    </select>
                  </div>

                </div>






                <div className='row mt-1'>
                  <div className='d-inline ml-2'>
                    Template Name: 
                  </div>
                  <div
                      className='d-inline ml-2'
                  >   
                      <input                                                      
                          id='template_name'                                      
                          key='template_name_1'                                   
                          title='template name'
                          size='15'                                               
                          value={this.state.template_name}
                          onChange={(event) => this.setTemplateName(event.target.value)}
                      /> 
                      {template_saved_unsaved}
                  </div>
                </div>

                <div className='row mt-1'>
                  <div className='d-inline ml-2'>
                    App Name: 
                  </div>
                  <div
                      className='d-inline ml-2'
                  >   
                      <input                                                      
                          id='app_name'                                      
                          key='app_name_1'                                   
                          title='app name'
                          size='15'                                               
                          value={this.state.app_name}
                          onChange={(event) => this.setTemplateAppName(event.target.value)}
                      /> 
                  </div>
                </div>

                <div className='row ml-2 mt-3 border-top'>
                  <div className='col'>
                    <div className='row mt-2'>
                      <div 
                          className='d-inline'
                      >
                        <button
                            className='btn btn-primary ml-2'
                            onClick={() => this.doTemplateExport() }
                        >
                          Export
                        </button>
                      </div>

                      <div 
                          className='d-inline ml-2'
                      >
                        {template_download_button}
                      </div>
                    </div>

                    <div className='row mb-2'>
                      <div className='d-inline mt-1'>
                        Import Template:
                      </div>
                      <div className='d-inline ml-2' >
                        <input 
                            type="file" 
                            id="template_file" 
                            name="template_files[]" 
                            size='20'
                            multiple 
                            onChange={(event) => this.importTemplate(event.target.files)}
                        />
                      </div>
                    </div>

                    <div className='row border-top'>
                      <div className='row m-3'>
                        <div className='d-inline ml-2'>
                          {anchor_pics}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>




              </div>

            </div>
          </div>
        </div>
    )
  }
}

export default TemplateControls;
