import React from 'react';

class TemplateControls extends React.Component {

  constructor(props) {
    super(props)
    this.state = {
      id: '',
      name: '',
      app_name: '',
      scale: '1_1',
      match_percent: 90,
      match_method: 'any',
      anchors: [],
      mask_zones: [],
      download_link: '',
      unsaved_changes: false,
    }
    this.anchorSliceDone=this.anchorSliceDone.bind(this)
    this.addAnchorCallback=this.addAnchorCallback.bind(this)
    this.addMaskZoneCallback=this.addMaskZoneCallback.bind(this)
  }

  componentDidMount() {
    if (this.props.current_template_id) {
      let template = this.props.templates[this.props.current_template_id]
      this.setState({
        id: template['id'],
        name: template['name'],
        app_name: template['app_name'],
        match_percent: template['match_percent'],
        match_method: template['match_method'],
        anchors: template['anchors'],
        mask_zones: template['mask_zones'],
        download_link: '',
        unsaved_changes: false,
      })
    }
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

  buildLoadButton() {                                                 
		const template_keys = Object.keys(this.props.templates)
    return (                                                        
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
          Load
        </button>
        <div className='dropdown-menu' aria-labelledby='loadTemplateDropdownButton'>
          {template_keys.map((value, index) => {
            return (
              <button
                  className='dropdown-item'
                  key={index}
                  onClick={() => this.loadTemplate(value)}
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
  } 

  loadNewTemplate() {
    this.props.setCurrentTemplateId('')
    this.setState({
      id: '',
      name: '',
      app_name: '',
      scale: '1_1',
      match_percent: 90,
      match_method: 'any',
      anchors: [],
      mask_zones: [],
      download_link: '',
      unsaved_changes: false,
    })
  }

  loadTemplate(template_id) {
    if (!template_id) {
      this.loadNewTemplate()
    } else {
      const template = this.props.templates[template_id]
      this.setState({
        id: template_id,
        name: template['name'],
        app_name: template['app_name'],
        scale: template['scale'],
        match_percent: template['match_percent'],
        match_method: template['match_method'],
        anchors: template['anchors'],
        mask_zones: template['mask_zones'],
        download_link: '',
        unsaved_changes: false,
      })
    }
    this.props.setCurrentTemplateId(template_id)
    this.props.displayInsightsMessage('Template has been loaded')
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
        download_link: dataStr,
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

  setName(the_name) {
    this.setState({
      name: the_name,
      unsaved_changes: true,
    })
  }

  setAppName(the_name) {
    this.setState({
      app_name: the_name,
      unsaved_changes: true,
    })
  }

  setScale(value) {
    this.setState({
      scale: value,
      unsaved_changes: true,
    })
  }

  setMatchPercent(value) {
    this.setState({
      match_percent: value,
      unsaved_changes: true,
    })
  }

  setMatchMethod(value) {
    this.setState({
      match_method: value,
      unsaved_changes: true,
    })
  }

  buildDeleteButton() {
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
                onClick={() => this.deleteTemplate(value)}
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

  deleteTemplate(template_id) {
    let deepCopyTemplates = JSON.parse(JSON.stringify(this.props.templates))
    delete deepCopyTemplates[template_id]
    this.props.setTemplates(deepCopyTemplates)
    if (template_id === this.props.current_template_id) {
      this.props.setCurrentTemplateId('')
    }
    this.props.displayInsightsMessage('Template was deleted')
  }

  addTemplateAnchor() {
    this.props.addInsightsCallback('add_template_anchor_2', this.addAnchorCallback)
    this.setState({
      unsaved_changes: true,
    })
    this.props.handleSetMode('add_template_anchor_1')
  }

  addAnchorCallback(start_coords, end_coords) {
    const anchor_id = 'anchor_' + Math.floor(Math.random(1000000, 9999999)*1000000000).toString()
    const the_anchor = {
        'id': anchor_id,
        'start': start_coords,
        'end': end_coords,
        'image': this.props.insights_image,
        'movie': this.props.movie_url,
    }
    let deepCopyAnchors = JSON.parse(JSON.stringify(this.state.anchors))
    deepCopyAnchors.push(the_anchor)
    this.setState({
      anchors: deepCopyAnchors,
      unsaved_changes: true,
    })
    this.props.handleSetMode('add_template_anchor_3')
  }

  addTemplateMaskZone() {
    this.props.addInsightsCallback('add_template_mask_zone_2', this.addMaskZoneCallback)
    this.setState({
      unsaved_changes: true,
    })
    this.props.handleSetMode('add_template_mask_zone_1')
  }

  addMaskZoneCallback(start_coords, end_coords) {
    const mask_zone_id = 'mask_zone_' + Math.floor(Math.random(1000000, 9999999)*1000000000).toString()
    const the_mask_zone = {
        'id': mask_zone_id,
        'start': start_coords,
        'end': end_coords,
        'image': this.props.insights_image,
        'movie': this.props.movie_url,
    }
    let deepCopyMaskZones = JSON.parse(JSON.stringify(this.state.mask_zones))
    deepCopyMaskZones.push(the_mask_zone)
    this.setState({
      mask_zones: deepCopyMaskZones,
      unsaved_changes: true,
    })
    this.props.handleSetMode('add_template_mask_zone_3')
  } 

  doSave() {
    if (!this.state.name) {
      this.props.displayInsightsMessage('Save aborted: Name is required for a template')
      return
    }
    let template_id = 'template_' + Math.floor(Math.random(1000000, 9999999)*1000000000).toString()
    if (this.state.id) {
      template_id = this.state.id
    }
    let template = {
      id: this.state.id,
      name: this.state.name,
      app_name: this.state.app_name,
      scale: this.state.scale,
      match_percent: this.state.match_percent,
      match_method: this.state.match_method,
      anchors: this.state.anchors,
      mask_zones: this.state.mask_zones,
    }
    let deepCopyTemplates = JSON.parse(JSON.stringify(this.props.templates))
    deepCopyTemplates[template_id] = template
    this.props.setTemplates(deepCopyTemplates)
    this.props.setCurrentTemplateId(template_id)
    this.setState({
      id: template_id,
      unsaved_changes: false,
    })
    this.props.displayInsightsMessage('Template has been saved')
  }

  buildDownloadButton() {
    if (!this.state.download_link) {
      return ''
    }
    const dl_name = this.state.name + '.json'
    return (
      <div 
          className='d-inline ml-2'
      >
        <a 
          href={this.state.download_link}
          download={dl_name}
        >
        download
        </a>
      </div>
    )
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

  clearAnchors() {
    this.setState({
      anchors: [],
      unsaved_changes: true,
    })
    this.props.displayInsightsMessage('Anchors have been cleared')
  }

  clearMaskZones() {                                                                                     
    this.setState({
      mask_zones: [],
      unsaved_changes: true,
    })
    this.props.displayInsightsMessage('Mask zones have been cleared')
  }

  clearTemplateMatches(scope) {
    if (scope === 'all_templates') {
      this.clearTemplateMatches()
    } else if (scope === 'all_movies') {
      this.props.setTemplateMatches(this.props.current_template_id, {})
    } else if (scope === 'movie') {
      const template_matches = this.props.getCurrentTemplateMatches()
      let deepCopy = JSON.parse(JSON.stringify(
        template_matches[this.props.current_template_id])
      )
      if (Object.keys(deepCopy).includes(this.props.movie_url)) {
        delete deepCopy[this.props.movie_url]
        this.props.setTemplateMatches(this.props.current_template_id, deepCopy)
      }
    }
    this.displayInsightsMessage('Template matches have been cleared')
  }

  buildNameField() {
    return (
      <div>
        <div className='d-inline ml-2'>
          Template name:
        </div>
        <div
            className='d-inline ml-2'
        >
            <input
                id='template_name'
                key='template_name_1'
                title='name'
                size='25'
                value={this.state.name}
                onChange={(event) => this.setName(event.target.value)}
            />
        </div>
      </div>
    )
  }

  buildAppNameField() {
    return (
        <div>
        <div className='d-inline ml-2'>
          App name:
        </div>
        <div
            className='d-inline ml-2'
        >
            <input
                id='template_app_name'
                key='template_app_name_1'
                title='name'
                size='25'
                value={this.state.app_name}
                onChange={(event) => this.setAppName(event.target.value)}
            />
        </div>
      </div>
    )
  }

  buildScaleDropdown() {
    return (
      <div>
        <div className='d-inline ml-2'>
          Scale
        </div>
        <div className='d-inline ml-2'>
          <select
              name='template_scale'
              value={this.props.scale}
              onChange={(event) => this.setScale(event.target.value)}
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
    )
  }

  buildMatchPercent() {
    return (
      <div>
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
                value={this.state.match_percent}
                onChange={(event) => this.setMatchPercent(event.target.value)}
            />
        </div>
      </div>
    )
  }

  buildMatchMethod() {
    return (
      <div>
        <div className='d-inline ml-2'>
          Match Method
        </div>
        <div className='d-inline ml-2'>
          <select
              name='template_match_method'
              value={this.state.match_method}
              onChange={(event) => this.setMatchMethod(event.target.value)}
          >
            <option value='all'>Match All Anchors</option>
            <option value='any'>Match Any Anchor</option>
          </select>
        </div>
      </div>
    )
  }

  buildImportButton() {
    return (
      <div>
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
    )
  }

  buildExportButton() {
    return (
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
    )
  }

  buildClearMatchesButton() {
    return (
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
              onClick={() => this.clearTemplateMatches('image')}
          >
            Image
          </button>
          <button className='dropdown-item'
              onClick={() => this.clearTemplateMatches('movie')}
          >
            Movie
          </button>
          <button className='dropdown-item'
              onClick={() => this.clearTemplateMatches('all_movies')}
          >
            All Movies
          </button>
          <button className='dropdown-item'
              onClick={() => this.clearTemplateMatches('all_templates')}
          >
            All Templates
          </button>
        </div>
      </div>
    )
  }

  buildSaveButton() {
    return (
      <div 
          className='d-inline'
      >
        <button
            className='btn btn-primary ml-2 mt-2'
            onClick={() => this.doSave()}
        >
          Save
        </button>
      </div>
    )
  }

  buildAddAnchorButton() {
    return (
      <button
          className='btn btn-primary ml-2 mt-2'
          onClick={() => this.addTemplateAnchor()}
      >
        Add Anchor
      </button>
    )
  }

  buildClearAnchorsButton() {
    return (
      <button
          className='btn btn-primary ml-2 mt-2'
          onClick={() => this.clearAnchors()}
      >
        Clear Anchors
      </button>
    )
  }

  buildAddMaskZoneButton() {
    return (
      <button
          className='btn btn-primary ml-2 mt-2'
          onClick={() => this.addTemplateMaskZone()}
      >
        Add Mask Zone
      </button>
    )
  }

  buildClearMaskZonesButton() {
    return (
      <button
          className='btn btn-primary ml-2 mt-2'
          onClick={() => this.clearMaskZones()}
      >
        Clear Zones
      </button>
    )
  }

  buildIdString() {
    if (!this.props.current_template_id) {
      return (
        <div className='d-inline ml-2 font-italic'>
          this template has not been saved and has no id yet
        </div>
      )
    }
    let unsaved_changes_string = ''
    if (this.state.unsaved_changes) {
      unsaved_changes_string = (
        <div className='font-weight-bold text-danger ml-2 h5'>
         there are unsaved changes - don't forget to press save
        </div>
      )
    }
    return (
      <div>
        <div className='d-inline ml-2'>
          template id {this.state.id}
        </div>
        <div className='d-inline ml-2 font-italic'>
          {unsaved_changes_string}
        </div>
      </div>
    )
  }

  render() {
    if (!this.props.visibilityFlags['templates']) {                                             
      return([])                                                                
    }

    const id_string = this.buildIdString()
    const load_button = this.buildLoadButton()
    const delete_button = this.buildDeleteButton()
    const download_button = this.buildDownloadButton()
    const anchor_pics = this.buildAnchorPics()
    const run_button = this.buildTemplateRunButton()
    const template_name = this.buildNameField()
    const template_app_name = this.buildAppNameField()
    const scale_dropdown = this.buildScaleDropdown() 
    const match_percent = this.buildMatchPercent()
    const match_method = this.buildMatchMethod()
    const import_button = this.buildImportButton()
    const export_button = this.buildExportButton()
    const clear_matches_button = this.buildClearMatchesButton()
    const save_button = this.buildSaveButton()
    const add_anchor_button = this.buildAddAnchorButton()
    const clear_anchors_button = this.buildClearAnchorsButton()
    const add_mask_zone_button = this.buildAddMaskZoneButton()
    const clear_mask_zones_button = this.buildClearMaskZonesButton()

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
                  {load_button}
                  {add_anchor_button}
                  {clear_anchors_button}
                  {add_mask_zone_button}
                  {clear_mask_zones_button}
                  {delete_button}
                  {save_button}
                  {run_button}
                  {clear_matches_button}
                </div>

                <div className='row mt-2'>
                  {id_string}
                </div>

                <div className='row mt-2'>
                  {scale_dropdown}
                </div>

                <div className='row mt-2'>
                  {match_percent}
                </div>

                <div className='row mt-2'>
                  {match_method}
                </div>

                <div className='row mt-1'>
                  {template_name}
                </div>

                <div className='row mt-1'>
                  {template_app_name}
                </div>

                <div className='row ml-2 mt-3 border-top'>
                  <div className='col'>
                    <div className='row mt-2'>
                      {export_button}
                      {download_button}
                    </div>

                    <div className='row mb-2'>
                      {import_button}
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
