import React from 'react';

class TemplateControls extends React.Component {

  constructor(props) {
    super(props)
    this.state = {
      id: '',
      name: '',
      attributes: {},
      scale: '1_1',
      match_percent: 90,
      match_method: 'any',
      scan_level: 'tier_2',
      anchors: [],
      mask_zones: [],
      download_link: '',
      unsaved_changes: false,
      attribute_search_name: '',
      attribute_search_value: '',
    }
    this.anchorSliceDone=this.anchorSliceDone.bind(this)
    this.addAnchorCallback=this.addAnchorCallback.bind(this)
    this.addMaskZoneCallback=this.addMaskZoneCallback.bind(this)
    this.setLocalVarsFromTemplate=this.setLocalVarsFromTemplate.bind(this)
  }

  setLocalVarsFromTemplate(template) {
    this.setState({
      id: template['id'],
      name: template['name'],
      attributes: template['attributes'],
      match_percent: template['match_percent'],
      match_method: template['match_method'],
      scan_level: template['scan_level'],
      anchors: template['anchors'],
      mask_zones: template['mask_zones'],
      download_link: '',
      unsaved_changes: false,
    })
  }

  componentDidMount() {
    if (this.props.current_template_id) {
      let template = this.props.templates[this.props.current_template_id]
      this.setLocalVarsFromTemplate(template)
    }
  }

  importTemplate(files) {
    var app_this = this
    let reader = new FileReader()
    reader.onload = (function(evt) {
      let template = JSON.parse(evt.target.result)
      if (template['id']) {
        app_this.setLocalVarsFromTemplate(template)
        app_this.props.displayInsightsMessage('Template has been loaded')
      }
      let deepCopyTemplates = JSON.parse(JSON.stringify(app_this.props.templates))
      deepCopyTemplates[template['id']] = template
      app_this.props.setGlobalStateVar('templates', deepCopyTemplates)
      app_this.props.setGlobalStateVar('current_template_id', template['id'])
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
    this.props.setGlobalStateVar('current_template_id', '')
    this.setState({
      id: '',
      name: '',
      attributes: {},
      scale: '1_1',
      match_percent: 90,
      match_method: 'any',
      scan_level: 'tier_2',
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
        attributes: template['attributes'],
        scale: template['scale'],
        match_percent: template['match_percent'],
        match_method: template['match_method'],
        scan_level: template['scan_level'],
        anchors: template['anchors'],
        mask_zones: template['mask_zones'],
        download_link: '',
        unsaved_changes: false,
      })
    }
    this.props.setGlobalStateVar('current_template_id', template_id)
    this.props.displayInsightsMessage('Template has been loaded')
  }

  async anchorSliceDone(response) {
    const anchor_id = response['anchor_id']
    const cropped_image_bytes = response['cropped_image_bytes']
    let deepCopyAnchors = JSON.parse(JSON.stringify(this.state.anchors))
    let something_changed = false
    for (let i=0; i < deepCopyAnchors.length; i++) {
      let anchor = deepCopyAnchors[i]
      if (anchor['id'] === anchor_id) {
        if (Object.keys(anchor).includes('cropped_image_bytes')) {
          if (anchor['cropped_image_bytes'] === cropped_image_bytes) {
            continue
          } else {
            anchor['cropped_image_bytes'] = cropped_image_bytes
            something_changed = true
          }
        } else {
          anchor['cropped_image_bytes'] = cropped_image_bytes
          something_changed = true
        }
      }
    }
    if (something_changed) {
      this.setState({
        anchors: deepCopyAnchors,
        unsaved_changes: true,
      }, 
      this.updateDownloadLink)
    } else {
      this.updateDownloadLink()
    }
  }

  updateDownloadLink() {
    let cur_template = {
      id: this.state.id,
      name: this.state.name,
      attributes: this.state.attributes,
      scale: this.state.scale,
      match_percent: this.state.match_percent,
      match_method: this.state.match_method,
      scan_level: this.state.scan_level,
      anchors: this.state.anchors,
      mask_zones: this.state.mask_zones,
    }
    let dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(cur_template))
    this.setState({
      download_link: dataStr,
    })
  }

  async exportCurrentAnchors() {
    for (let i=0; i < this.state.anchors.length; i++) {
      let the_anchor = this.state.anchors[i]
      let resp = this.props.cropImage(
        the_anchor['image'], 
        the_anchor['start'], 
        the_anchor['end'], 
        the_anchor['id'], 
        this.anchorSliceDone
      )
      await resp
    }
  }

  setName(the_name) {
    this.setState({
      name: the_name,
      unsaved_changes: true,
    })
  }

  setAttribute(name, value) {
    let deepCopyAttributes = JSON.parse(JSON.stringify(this.state.attributes))
    deepCopyAttributes[name] = value
    this.setState({
      attributes: deepCopyAttributes,
      unsaved_changes: true,
    })
    this.props.displayInsightsMessage('Attribute was added')
  }

  doAddAttribute() {
    const value_ele = document.getElementById('template_attribute_value')
    const name_ele = document.getElementById('template_attribute_name')
    if (value_ele.value && name_ele.value) {
      this.setAttribute(name_ele.value, value_ele.value)
      name_ele.value = ''
      value_ele.value = ''
    }
  }

  deleteAttribute(name) {
    let deepCopyAttributes = JSON.parse(JSON.stringify(this.state.attributes))
    if (!Object.keys(this.state.attributes).includes(name)) {
      return
    }
    delete deepCopyAttributes[name]
    this.setState({
      attributes: deepCopyAttributes,
      unsaved_changes: true,
    })
    this.props.displayInsightsMessage('Attribute was deleted')
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

  setScanLevel(value) {
    this.setState({
      scan_level: value,
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
    this.props.setGlobalStateVar('templates', deepCopyTemplates)
    if (template_id === this.props.current_template_id) {
      this.props.setGlobalStateVar('current_template_id', '')
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

  addAnchorCallback(end_coords) {
    const start_coords = this.props.clicked_coords
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

  addMaskZoneCallback(end_coords) {
    const start_coords = this.props.clicked_coords
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

  async doSave(when_done=(()=>{})) {
    if (!this.state.name) {
      this.props.displayInsightsMessage('Save aborted: Name is required for a template')
      return
    }
    let eca_response = this.exportCurrentAnchors()
    .then(() => {
      let template_id = 'template_' + Math.floor(Math.random(1000000, 9999999)*1000000000).toString()
      if (this.state.id) {
        template_id = this.state.id
      }
      let template = {
        id: template_id,
        name: this.state.name,
        attributes: this.state.attributes,
        scale: this.state.scale,
        match_percent: this.state.match_percent,
        match_method: this.state.match_method,
        scan_level: this.state.scan_level,
        anchors: this.state.anchors,
        mask_zones: this.state.mask_zones,
      }
      let deepCopyTemplates = JSON.parse(JSON.stringify(this.props.templates))
      deepCopyTemplates[template_id] = template
      this.props.setGlobalStateVar('templates', deepCopyTemplates)
      this.props.setGlobalStateVar('current_template_id', template_id)
      this.setState({
        id: template_id,
        unsaved_changes: false,
      })
      this.props.displayInsightsMessage('Template has been saved')
      return template
    })
    .then((template) => {
      when_done(template)
    })
    await eca_response
  }

  async doSaveToDatabase() {
    this.doSave(((response)=>{
      this.props.saveCurrentTemplateToDatabase()
      this.props.displayInsightsMessage('Template has been saved to database')
    }))
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
    let anchor_images = []
    for (let i=0; i < this.state.anchors.length; i++) {
      let anchor = this.state.anchors[i]
      if (Object.keys(anchor).includes('cropped_image_bytes')) {
        anchor_images[anchor['id']] = anchor['cropped_image_bytes']
      }
    }
    for (let i=0; i < Object.keys(anchor_images).length; i++) {
      const anchor_id = Object.keys(anchor_images)[i]
      const the_src = "data:image/gif;base64," + anchor_images[anchor_id]
      return_arr.push(
        <div 
          key={'hey' + i}
          className='p-2 border-bottom'
        >
          <div className='d-inline'>
            <div className='d-inline'>
              id: 
            </div>
            <div className='d-inline ml-2'>
              {anchor_id}
            </div>
          </div>
          <div className='d-inline ml-2'>
            <img 
              max-height='100'
              max-width='100'
              key={'dapper' + i}
              alt={anchor_id}
              title={anchor_id}
              src={the_src}
            />
          </div>
        </div>
      )
    }
    return return_arr
  }

  buildTier1TemplateRunOptions() {
    if (this.state.scan_level === 'tier_1') {
      return ''
    }
    const tier_1_match_keys = Object.keys(this.props.tier_1_matches['template'])
    if (tier_1_match_keys.length === 0) {
      return ''
    }

    return (
      <div>
        {tier_1_match_keys.map((value, index) => {
          const detail_line = 'Frames matched by template ' + this.props.templates[value]['name']
          return (
            <button
                className='dropdown-item'
                key={index}
                onClick={() => this.props.submitInsightsJob('current_template_tier1_template', value)}
            >
              {detail_line}
            </button>
          )
        })}
      </div>
    )
  }

  buildTemplateRunButton() {
    let movie_set_keys = Object.keys(this.props.movie_sets)
    const tier_1_options = this.buildTier1TemplateRunOptions()
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
          <button className='dropdown-item'
              onClick={() => this.props.submitInsightsJob('current_template_telemetry_matches')}
          >
            Telemetry Matches
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
          {tier_1_options}
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
    let deepCopyTier1Matches = JSON.parse(JSON.stringify(this.props.tier_1_matches))
    let deepCopyTemplateMatches = deepCopyTier1Matches['template']
    if (scope === 'all_templates') {
      deepCopyTier1Matches['template'] = {}
      this.props.setGlobalStateVar('tier_1_matches', deepCopyTier1Matches)
      this.props.displayInsightsMessage('All template matches have been cleared')
    } else if (scope === 'all_movies') {
      delete deepCopyTemplateMatches[this.props.current_template_id]
      deepCopyTier1Matches['template'] = deepCopyTemplateMatches
      this.props.setGlobalStateVar('tier_1_matches', deepCopyTier1Matches)
      this.props.displayInsightsMessage('Template matches for this template + all movies have been cleared')
    } else if (scope === 'movie') {
      if (Object.keys(deepCopyTemplateMatches[this.props.current_template_id]).includes(this.props.movie_url)) {
        delete deepCopyTemplateMatches[this.props.current_template_id][this.props.movie_url]
        deepCopyTier1Matches['template'] = deepCopyTemplateMatches
        this.props.setGlobalStateVar('tier_1_matches', deepCopyTier1Matches)
        this.props.displayInsightsMessage('Template matches for this template + this movie have been cleared')
      }
    }
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

  buildAttributesList() {
    return (
        <div>
        <div className='font-weight-bold'>
          Attributes
        </div>
        <div>
          <div className='d-inline ml-2'>
            Name:
          </div>
          <div className='d-inline ml-2'>
            <input
                id='template_attribute_name'
                key='template_attribute_name_1'
                title='attribute name'
                size='25'
            />
          </div>
          <div className='d-inline ml-2'>
            Value:
          </div>
          <div className='d-inline ml-2'>
            <input
                id='template_attribute_value'
                key='template_attribute_value_1'
                title='attribute value'
                size='25'
            />
          </div>
          <div className='d-inline ml-2'>
            <button
                className='btn btn-primary p-1'
                key={889922}
                onClick={() => this.doAddAttribute()}
            >
              Add
            </button>
          </div>
        </div>
        <div>
          {Object.keys(this.state.attributes).map((name, index) => {
            return (
              <div key={index} className='mt-2'>
                <div className='d-inline'>
                  Name:
                </div>
                <div className='d-inline ml-2'>
                  {name} 
                </div>
                <div className='d-inline ml-4'>
                  Value:
                </div>
                <div className='d-inline'>
                  {this.state.attributes[name]}
                </div>
                <div className='d-inline ml-2'>
                  <button
                      className='btn btn-primary'
                      key={index}
                      onClick={() => this.deleteAttribute(name)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            )
          })}
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
              value={this.state.scale}
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

  buildScanLevel() {
    const help_text = "Tier 1 means 'search for areas that match your critieria, then just return a yes if they exist', Tier 2 means 'search for matches, then use the mask zones from the anchors you have matched on to make areas to redact'"
    return (
      <div
          title={help_text}
      >
        <div className='d-inline ml-2'>
          Scan Level
        </div>
        <div className='d-inline ml-2'>
          <select
              name='template_scan_level'
              value={this.state.scan_level}
              onChange={(event) => this.setScanLevel(event.target.value)}
          >
            <option value='tier_1'>Tier 1 (match only)</option>
            <option value='tier_2'>Tier 2 (match and mask)</option>
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
          className='d-inline mb-1'
      >
        <button
            className='btn btn-primary'
            onClick={() => this.exportCurrentAnchors() }
        >
          Export this Template
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

  buildSaveToDatabaseButton() {
    return (
      <div 
          className='d-inline'
      >
        <button
            className='btn btn-primary ml-2 mt-2'
            onClick={() => this.doSaveToDatabase()}
        >
          Save to DB
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
        <div className='d-inline ml-2 font-weight-bold text-danger font-italic h5'>
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
          Template id: {this.state.id}
        </div>
        <div className='d-inline ml-2 font-italic'>
          {unsaved_changes_string}
        </div>
      </div>
    )
  }

  showTemplateSource(movie_url, image_frameset_index) {
    this.props.setCurrentVideo(movie_url)
    setTimeout((() => {this.props.setScrubberToIndex(image_frameset_index)}), 1000)
  }

  buildSourceMovieImageInfo() {
    if (this.state.id) {
      if (Object.keys(this.props.templates).includes(this.state['id'])) {
        const template = this.props.templates[this.state['id']]
        if (template['anchors'].length > 0) {
          const movie_url = template['anchors'][0]['movie']
          const image_url = template['anchors'][0]['image']
          let goto_link = ''
          if (Object.keys(this.props.movies).includes(movie_url)) {
            const the_movie = this.props.movies[movie_url]
            const the_frameset = this.props.getFramesetHashForImageUrl(image_url, the_movie['framesets'])
            const movie_framesets = this.props.getFramesetHashesInOrder(the_movie['framesets'])
            const image_frameset_index = movie_framesets.indexOf(the_frameset)
            goto_link = (
              <div>
                <button
                  className='bg-light border-0 text-primary'
                  onClick={() => this.showTemplateSource(movie_url, image_frameset_index)}
                >
                  goto anchor source frame
                </button>
              </div>
            )
          }
          const style = {
            'fontSize': 'small',
          }
          return (
            <div className='ml-2'>
              <div>
                Source Info
              </div>
              <div style={style}>
                <div className='d-inline ml-2'>
                  Movie url:
                </div>
                <div className='d-inline ml-2'>
                  {movie_url}
                </div>
              </div>
              <div style={style}>
                <div className='d-inline ml-2'>
                  Image url:
                </div>
                <div className='d-inline ml-2'>
                  {image_url}
                </div>
              </div>
              {goto_link}
            </div>
          )
        }
      }
    }
  }

  doGetScanners() {
    const attr_search_name = document.getElementById('template_database_search_attribute_name').value
    const attr_search_value = document.getElementById('template_database_search_attribute_value').value
    this.setState({
      attribute_search_name: attr_search_name,
      attribute_search_value: attr_search_value,
    })
    this.props.getScanners()
  }

  importAllScanners() {
    const matches = this.getMatchingScanners() 
    for (let i=0; i < matches.length; i++) {
      const match = matches[i]
      this.props.importScanner(match['id'])
    }
    this.props.displayInsightsMessage('All templates have been imported')
  }

  getMatchingScanners() {
    let matches = []
    for (let i=0; i < this.props.scanners.length; i++) {
      const scanner = this.props.scanners[i]
      if (scanner['type'] === 'template') {
        if (this.state.attribute_search_name || this.state.attribute_search_value) {
          for (let j=0; j < Object.keys(scanner['attributes']).length; j++) {
            const attr_name = Object.keys(scanner['attributes'])[j]
            const attr_value = scanner['attributes'][attr_name]
            if ((attr_name === this.state.attribute_search_name) && 
                (attr_value === this.state.attribute_search_value)) {
              matches.push(scanner)
            }
          }
        } else {
          matches.push(scanner)
        }
      }
    }
    return matches
  }

  getDatabaseTemplatesList() {
    const matches = this.getMatchingScanners() 
    if (matches.length === 0) {
      return ''
    }
    let style = {
      'fontSize': '10px',
    }
    return (
      <div>
        <div className='font-weight-bold ml-3 mt-3'>
          Search Results
        </div>
        <table 
          className='table-striped'
          style={style}
        >
          <thead>
            <tr>
              <th scope='col'>
                <button
                  className='btn btn-primary'
                  style={style}
                  onClick={() => this.importAllScanners()}
                >
                  Import All
                </button>
              </th>
              <th scope='col' className='p-1 text-center'>name</th>
              <th scope='col' className='p-1 text-center'>created</th>
              <th scope='col' className='p-1 text-center'>attributes</th>
              <th scope='col' className='p-1 text-center'>metadata</th>
              <th scope='col'></th>
            </tr>
          </thead>
          <tbody>
          {matches.map((match, index) => {
            let attributes = []
            for (let i=0; i < Object.keys(match['attributes']).length; i++) {
              const attrib_name = Object.keys(match['attributes'])[i]
              const attrib_value = match['attributes'][attrib_name]
              const key_val='attrib_'+i.toString()
              attributes.push(
                <div key={key_val}>
                  <div className='d-inline'>
                    {attrib_name} :
                  </div>
                  <div className='d-inline ml-2'>
                    {attrib_value}
                  </div>
                </div>
              )
            }
            let meta = []
            for (let i=0; i < Object.keys(match['content_metadata']).length; i++) {
              const meta_name = Object.keys(match['content_metadata'])[i]
              const meta_value = match['content_metadata'][meta_name]
              const key_val='meta_'+i.toString()
              meta.push(
                <div key={key_val}>
                  <div className='d-inline'>
                    {meta_name} :
                  </div>
                  <div className='d-inline ml-1'>
                    {meta_value}
                  </div>
                </div>
              )
            }
            return (
              <tr key={index}>
                <td className='p-1'>
                  <button
                    className='btn btn-primary'
                    style={style}
                    onClick={() => this.props.importScanner(
                      match['id'],
                      (()=> {this.props.displayInsightsMessage('Template has been imported')})
                    )}
                  >
                    Import
                  </button>
                </td>
                <td className='p-1'>
                  {match['name']}
                </td>
                <td className='p-1 border-left'>
                  {match['created_on'].substring(0, 16)}
                </td>
                <td className='p-1 border-left'>
                  {attributes}
                </td>
                <td className='p-1 border-left'>
                  {meta}
                </td>
                <td className='p-1'>
                  <button
                    className='btn btn-primary'
                    style={style}
                    onClick={() => this.props.deleteScanner(match['id'])}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            )
          })}
          </tbody>
        </table>
      </div>
    )
  }

  buildDatabaseSection() {
    const database_templates_list = this.getDatabaseTemplatesList()
    return (
      <div>
        <div className='font-weight-bold'>
          Database
        </div>
        <div>
          <div className='d-inline'>
            Search by Attribute:
          </div>
          <div className='d-inline ml-2'>
            Name:
          </div>
          <div className='d-inline ml-2'>
            <input 
                id='template_database_search_attribute_name'
                size='20'
                title='template attribute name'
            />
          </div>
          <div className='d-inline ml-2'>
            Value:
          </div>
          <div className='d-inline ml-3'>
            <input 
                id='template_database_search_attribute_value'
                size='20'
                title='template attribute value'
            />
          </div>
          <div className='d-inline ml-3'>
            <button
              className='btn btn-primary p-1'
              onClick={() => this.doGetScanners()}
            >
              Go
            </button>
          </div>
        </div>
        <div>
          {database_templates_list}
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
    const attributes_list = this.buildAttributesList()
    const scale_dropdown = this.buildScaleDropdown() 
    const match_percent = this.buildMatchPercent()
    const match_method = this.buildMatchMethod()
    const scan_level = this.buildScanLevel()
    const import_button = this.buildImportButton()
    const export_button = this.buildExportButton()
    const clear_matches_button = this.buildClearMatchesButton()
    const save_button = this.buildSaveButton()
    const save_to_database_button = this.buildSaveToDatabaseButton()
    const add_anchor_button = this.buildAddAnchorButton()
    const clear_anchors_button = this.buildClearAnchorsButton()
    const add_mask_zone_button = this.buildAddMaskZoneButton()
    const clear_mask_zones_button = this.buildClearMaskZonesButton()
    const template_source_movie_image_info = this.buildSourceMovieImageInfo()
    const database_section = this.buildDatabaseSection()

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
                  {save_to_database_button}
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

                <div className='row mt-2'>
                  {scan_level}
                </div>

                <div className='row mt-1'>
                  {template_name}
                </div>

                <div className='row mt-1 ml-1 mr-1 border-top'>
                  {attributes_list}
                </div>

                <div className='row mt-3 ml-1 mr-1 border-top'>
                  <div className='col'>
                    <div className='row'>
                      <div className='font-weight-bold'>
                        Anchors
                      </div>

                      <div className='row mt-1'>
                        {template_source_movie_image_info}
                      </div>

                      <div className='row m-3'>
                        <div className='d-inline ml-2'>
                          {anchor_pics}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className='row ml-1 mt-3 mr-1 border-top'>
                  <div className='col'>
                    <div className='row font-weight-bold'>
                      Save/Load Files
                    </div>
                    <div className='row ml-1 mt-2'>
                      {export_button}
                      {download_button}
                    </div>

                    <div className='row ml-1 mb-2'>
                      {import_button}
                    </div>
                  </div>
                </div>

                <div className='row mt-3 ml-1 mr-1 border-top'>
                  {database_section}
                </div>

              </div>

            </div>
          </div>
        </div>
    )
  }
}

export default TemplateControls;
