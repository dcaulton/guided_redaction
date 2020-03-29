import React from 'react';
import ScannerSearchControls from './ScannerSearchControls'
import {
  buildAttributesAddRow, buildLabelAndTextInput, buildLabelAndDropdown,
  buildInlinePrimaryButton,
  makeHeaderRow,
  buildTier1LoadButton,
  buildTier1DeleteButton,
  buildAttributesAsRows,
  buildIdString,
  clearTier1Matches,
  buildClearMatchesButton,
  doTier1Save,
} from './SharedControls'


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
    this.getCurrentAnchors=this.getCurrentAnchors.bind(this)
    this.getCurrentMaskZones=this.getCurrentMaskZones.bind(this)
    this.getTemplateFromState=this.getTemplateFromState.bind(this)
    this.setLocalStateVar=this.setLocalStateVar.bind(this)
  }

  setLocalStateVar(var_name, var_value, when_done=(()=>{})) {
    this.setState({
      [var_name]: var_value,
      unsaved_changes: true,
    },
    when_done())
  }

  getCurrentAnchors() {
    return this.state.anchors
  }

  getCurrentMaskZones() {
    return this.state.mask_zones
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
    this.props.addInsightsCallback('getCurrentTemplateAnchors', this.getCurrentAnchors)
    this.props.addInsightsCallback('getCurrentTemplateMaskZones', this.getCurrentMaskZones)
    this.props.addInsightsCallback('add_template_anchor_2', this.addAnchorCallback)
    this.props.addInsightsCallback('add_template_mask_zone_2', this.addMaskZoneCallback)
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
    return buildTier1LoadButton(
      'template',
      this.props.templates,
      ((value)=>{this.loadTemplate(value)})
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

  buildDeleteButton() {
    return buildTier1DeleteButton(
      'template',
      this.props.templates,
      ((value)=>{this.deleteTemplate(value)})
    )
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
    this.props.handleSetMode('add_template_anchor_1')
  }

  addTemplateMaskZone() {
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
    this.props.handleSetMode('add_template_mask_zone_1')
  } 

  getTemplateFromState() {
    const template = {
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
    return template
  }

  async doSave(when_done=(()=>{})) {
    let eca_response = this.exportCurrentAnchors()
    .then(() => {
      const template = doTier1Save(
        'template',
        this.state.name,
        this.getTemplateFromState,
        this.props.displayInsightsMessage,
        this.props.templates,
        'templates',
        'current_template_id',
        this.setLocalStateVar,
        this.props.setGlobalStateVar,
      )
      return template
    })
    .then((template) => {
      when_done(template)
    })
    await eca_response
  }

  async doSaveToDatabase() {
    this.doSave(((template)=>{
      this.props.saveScannerToDatabase(
        'template', 
        template,
        (()=>{this.props.displayInsightsMessage('Template has been saved to database')})
      )
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

// TODO make this a shared module 
  buildRunButton() {
    if (!this.state.id) {
      return ''
    }
    const tier_1_template_run_options = this.props.buildTier1RunOptions('template', 'template_t1_template')
    const tier_1_selected_area_run_options = this.props.buildTier1RunOptions('selected_area', 'template_t1_selected_area')
    const tier_1_ocr_run_options = this.props.buildTier1RunOptions('ocr', 'template_t1_ocr')
    const tier_1_telemetry_run_options = this.props.buildTier1RunOptions('telemetry', 'template_t1_telemetry')
    const movie_set_run_options = this.props.buildMovieSetOptions('template_movie_set')

    return (
      <div className='d-inline'>
        <button
            className='btn btn-primary ml-2 dropdown-toggle'
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
              onClick={() => this.props.submitInsightsJob('template_current_frame')}
          >
            Frame
          </button>
          <button className='dropdown-item'
              onClick={() => this.props.submitInsightsJob('template_current_movie')}
          >
            Movie
          </button>
          <button className='dropdown-item'
              onClick={() => this.props.submitInsightsJob('template_all_movies')}
          >
            All Movies
          </button>
          {movie_set_run_options} 
          {tier_1_template_run_options}
          {tier_1_selected_area_run_options}
          {tier_1_ocr_run_options}
          {tier_1_telemetry_run_options}
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
    return clearTier1Matches(
      'template',
      this.props.tier_1_matches,
      this.props.current_template_id,
      this.props.movie_url,
      ((a,b)=>{this.props.setGlobalStateVar(a,b)}),
      ((a)=>{this.props.displayInsightsMessage(a)}),
      scope
    )
  }

  buildAttributesList() {
    const add_attr_row = buildAttributesAddRow(
      'template_attribute_name',
      'template_attribute_value',
      (()=>{this.doAddAttribute()})

    )
    const attribs_list = buildAttributesAsRows(
      this.state.attributes,
      ((value)=>{this.deleteAttribute(value)})
    )
    return (
      <div>
        {add_attr_row}
        {attribs_list}
      </div>
    )
  }

  buildScaleDropdown() {
    const scale_values = [
      {'1:1': 'actual image scale only'},
      {'+/-10/1': '+/- 10%, 1% increments'},
      {'+/-20/1': '+/- 20%, 1% increments'},
      {'+/-20/5': '+/- 20%, 5% increments'},
      {'+/-25/1': '+/- 25%, 1% increments'},
      {'+/-25/5': '+/- 25%, 5% increments'},
      {'+/-40/1': '+/- 40%, 1% increments'},
      {'+/-40/5': '+/- 40%, 5% increments'},
      {'+/-50/1': '+/- 50%, 1% increments'},
      {'+/-50/5': '+/- 50%, 5% increments'}
    ]
    return buildLabelAndDropdown(
      scale_values,
      'Scale',
      this.state.scale,
      'template_scale',
      ((value)=>{this.setLocalStateVar('scale', value)})
    )
  }

  buildMatchPercent() {
    return buildLabelAndTextInput(
      this.state.match_percent,
      'Match Percent',
      'template_match_percent',
      'match percent',
      4,
      ((value)=>{this.setLocalStateVar('match_percent', value)})
    )
  }

  buildMatchMethod() {
    return buildLabelAndDropdown(
      [{'all': 'Match All Anchors'}, {'any': 'Match Any Anchors'}],
      'Match Method',
      this.state.match_method,
      'template_match_method',
      ((value)=>{this.setLocalStateVar('match_method', value)})
    )
  }

  buildScanLevel() {
    return buildLabelAndDropdown(
      [{'tier_1': 'Tier 1 (select only)'}, {'tier_2': 'Tier 2 (select and redact)'}],
      'Scan Level',
      this.state.scan_level,
      'template_scan_level',
      ((value)=>{this.setLocalStateVar('scan_level', value)})
    )
  }

  buildNameField() {
    return buildLabelAndTextInput(
      this.state.name,
      'Name',
      'template_name',
      'name',
      25,
      ((value)=>{this.setLocalStateVar('name', value)})
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

  buildClearMatchesButton2() {
    return buildClearMatchesButton(
      'template',
      ((a)=>{this.clearTemplateMatches(a)})
    )
  }

  buildSaveButton() {
    return buildInlinePrimaryButton(
      'Save',
      (()=>{this.doSave()})
    )
  }

  buildSaveToDatabaseButton() {
    return buildInlinePrimaryButton(
      'Save to DB',
      (()=>{this.doSaveToDatabase()})
    )
  }

  buildAddAnchorButton() {
    return buildInlinePrimaryButton(
      'Add Anchor',
      (()=>{this.addTemplateAnchor()})
    )
  }

  buildClearAnchorsButton() {
    return buildInlinePrimaryButton(
      'Clear Anchors',
      (()=>{this.clearAnchors()})
    )
  }

  buildAddMaskZoneButton() {
    return buildInlinePrimaryButton(
      'Add Mask Zone',
      (()=>{this.addTemplateMaskZone()})
    )
  }

  buildClearMaskZonesButton() {
    return buildInlinePrimaryButton(
      'Clear Zones',
      (()=>{this.clearMaskZones()})
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

  render() {
    if (!this.props.visibilityFlags['templates']) {                                             
      return([])                                                                
    }

    const id_string = buildIdString(this.state.id, 'template', this.state.unsaved_changes)
    const load_button = this.buildLoadButton()
    const delete_button = this.buildDeleteButton()
    const download_button = this.buildDownloadButton()
    const anchor_pics = this.buildAnchorPics()
    const run_button = this.buildRunButton()
    const template_name = this.buildNameField()
    const attributes_list = this.buildAttributesList()
    const scale_dropdown = this.buildScaleDropdown() 
    const match_percent = this.buildMatchPercent()
    const match_method = this.buildMatchMethod()
    const scan_level = this.buildScanLevel()
    const import_button = this.buildImportButton()
    const export_button = this.buildExportButton()
    const clear_matches_button = this.buildClearMatchesButton2()
    const save_button = this.buildSaveButton()
    const save_to_database_button = this.buildSaveToDatabaseButton()
    const add_anchor_button = this.buildAddAnchorButton()
    const clear_anchors_button = this.buildClearAnchorsButton()
    const add_mask_zone_button = this.buildAddMaskZoneButton()
    const clear_mask_zones_button = this.buildClearMaskZonesButton()
    const template_source_movie_image_info = this.buildSourceMovieImageInfo()
    const header_row = makeHeaderRow(
      'templates',
      'template_controls_body'
    )

    return (
        <div className='row bg-light rounded'>
          <div className='col'>

            {header_row}

            <div 
                id='template_controls_body' 
                className='row collapse'
            >
              <div id='template_controls_main' className='col'>

                <div className='row'>
                  {load_button}
                  {delete_button}
                  {save_button}
                  {save_to_database_button}
                  {clear_matches_button}
                  {run_button}
                </div>

                <div className='row mt-2'>
                  {add_anchor_button}
                  {clear_anchors_button}
                  {add_mask_zone_button}
                  {clear_mask_zones_button}
                </div>

                <div className='row mt-2'>
                  {id_string}
                </div>

                <div className='row mt-1'>
                  {template_name}
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
                  <ScannerSearchControls
                    search_attribute_name_id='template_database_search_attribute_name'
                    search_attribute_value_id='template_database_search_attribute_value'
                    getScanners={this.props.getScanners}
                    importScanner={this.props.importScanner}
                    deleteScanner={this.props.deleteScanner}
                    scanners={this.props.scanners}
                    displayInsightsMessage={this.props.displayInsightsMessage}
                    search_type='template'
                  />
                </div>

              </div>

            </div>
          </div>
        </div>
    )
  }
}

export default TemplateControls;
