import React from 'react'
import {
  buildLabelAndTextInput,
  buildInlinePrimaryButton,
  buildTier1LoadButton,
  buildTier1DeleteButton,
  buildIdString,
  doTier1Save,
} from './SharedControls'

class SimpleTemplateBuilderControls extends React.Component {

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
    this.getTemplateFromState=this.getTemplateFromState.bind(this)
    this.do_add_template_anchor_2=this.do_add_template_anchor_2.bind(this)
    this.do_add_template_mask_zone_2=this.do_add_template_mask_zone_2.bind(this)
    this.anchorSliceDone=this.anchorSliceDone.bind(this)
    this.do_add_template_anchor_1=this.do_add_template_anchor_1.bind(this)
    this.do_add_template_anchor_2=this.do_add_template_anchor_2.bind(this)
    this.do_add_template_mask_zone_1=this.do_add_template_mask_zone_1.bind(this)
    this.do_add_template_mask_zone_2=this.do_add_template_mask_zone_2.bind(this)
  }

  componentDidMount() {
    this.props.addCallback({
      'add_template_anchor_1': this.do_add_template_anchor_1,
      'add_template_anchor_2': this.do_add_template_anchor_2,
      'add_template_mask_zone_1': this.do_add_template_mask_zone_1,
      'add_template_mask_zone_2': this.do_add_template_mask_zone_2,
    })
    this.loadNewTemplate()
  }

  do_add_template_mask_zone_1(end_coords) {
    this.props.setMode('add_template_mask_zone_2')
  }

  do_add_template_mask_zone_2(end_coords) {
    const start_coords = this.props.last_click
    const mask_zone_id = 'mask_zone_' + this.makeRandomIntToString()
    const image_url = this.props.getImageUrl()
    const the_mask_zone = {
        'id': mask_zone_id,
        'start': start_coords,
        'end': end_coords,
        'image': image_url,
        'movie': this.props.movie_url,
    }
    let deepCopyMaskZones = JSON.parse(JSON.stringify(this.state.mask_zones))
    deepCopyMaskZones.push(the_mask_zone)
    this.setState({
      mask_zones: deepCopyMaskZones,
      unsaved_changes: true,
    })
    this.doSave()
    this.props.setMode('view')
    this.props.setMessage('mask zone was successfully added')
  }

  makeRandomIntToString() {
    return Math.floor(Math.random(1000000, 9999999)*1000000000).toString()
  }

  do_add_template_anchor_1(end_coords) {
    this.props.setMode('add_template_anchor_2')
  }

  do_add_template_anchor_2(end_coords) {
    const start_coords = this.props.last_click
    const anchor_id = 'anchor_' + this.makeRandomIntToString()
    const image_url = this.props.getImageUrl()
    const the_anchor = {
        'id': anchor_id,
        'start': start_coords,
        'end': end_coords,
        'image': image_url,
        'movie': this.props.movie_url,
    }
    let deepCopyAnchors = JSON.parse(JSON.stringify(this.state.anchors))
    deepCopyAnchors.push(the_anchor)
    this.setState({
      anchors: deepCopyAnchors,
      unsaved_changes: true,
    },
    (() => {this.exportCurrentAnchors()}),
    )
    this.props.setMode('view')
    this.doSave()
    this.props.setMessage('anchor was successfully added')
  }

  loadNewTemplate() {
    let deepCopyIds = JSON.parse(JSON.stringify(this.props.tier_1_scanner_current_ids))
    deepCopyIds['template'] = ''
    this.props.setGlobalStateVar('tier_1_scanner_current_ids', deepCopyIds)
    const the_id = 'template_' + this.makeRandomIntToString()

    this.setState({
      id: the_id,
      name: 'default name',
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
      const template = this.props.tier_1_scanners['template'][template_id]
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
    let deepCopyIds = JSON.parse(JSON.stringify(this.props.tier_1_scanner_current_ids))
    deepCopyIds['template'] = template_id
    this.props.setGlobalStateVar('tier_1_scanner_current_ids', deepCopyIds)
  }

  buildNameField() {
    return buildLabelAndTextInput(
      this.state.name,
      'Name',
      'mini_template_name',
      'name',
      25,
      ((value)=>{this.setLocalStateVar('name', value)})
    )
  }

  setLocalStateVar(var_name, var_value, when_done=(()=>{})) {
    this.setState({
      [var_name]: var_value,
      unsaved_changes: true,
    },
    when_done())
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
      })                                                                        
      this.doSave()
    } 
  }

  async doSave(when_done=(()=>{})) {
    let eca_response = this.exportCurrentAnchors()
    .then(() => {
      const template = doTier1Save(
        'template',
        this.getTemplateFromState,
        this.props.setMessage,
        this.props.tier_1_scanners,
        this.props.tier_1_scanner_current_ids,
        this.props.setGlobalStateVar,
      )
      return template
    })
    .then((template) => {
      this.setState({
        unsaved_changes: false,
      })
      when_done(template)
    })
    await eca_response
  }

  buildLoadButton() {
    return buildTier1LoadButton(
      'template',
      this.props.tier_1_scanners['template'],
      ((value)=>{this.loadTemplate(value)})
    )
  }

  buildSaveButton() {
    return buildInlinePrimaryButton(
      'Save',
      (()=>{this.doSave()})
    )
  }

  deleteTemplate(template_id) {
    let deepCopyScanners = JSON.parse(JSON.stringify(this.props.tier_1_scanners))
    let deepCopyTemplates = deepCopyScanners['template']
    delete deepCopyTemplates[template_id]
    deepCopyScanners['template'] = deepCopyTemplates
    this.props.setGlobalStateVar('tier_1_scanners', deepCopyScanners)
    if (template_id === this.props.tier_1_scanner_current_ids['template']) {
      let deepCopyIds = JSON.parse(JSON.stringify(this.props.tier_1_scanner_current_ids))
      deepCopyIds['template'] = ''
      this.props.setGlobalStateVar('tier_1_scanner_current_ids', deepCopyIds)
    }
    setTimeout((() => {this.props.setGlobalStateVar('message', 'Template was deleted')}), 500)
  }

  buildDeleteButton() {
    return buildTier1DeleteButton(
      'template',
      this.props.tier_1_scanners['template'],
      ((value)=>{this.deleteTemplate(value)})
    )
  }

  buildAddAnchorButton() {
    if (this.state.anchors.length) {
      return ''
    }
    return buildInlinePrimaryButton(
      'Add Anchor',
      (()=>{this.addTemplateAnchor()})
    )
  }

  buildAddMaskZoneButton() {
    return buildInlinePrimaryButton(
      'Add Mask Zone',
      (()=>{this.addTemplateMaskZone()})
    )
  }

  addTemplateAnchor() {
    this.setState({
      unsaved_changes: true,
    })
    this.props.setMode('add_template_anchor_1')
  }

  addTemplateMaskZone() {
    this.setState({
      unsaved_changes: true,
    })
    this.props.setMode('add_template_mask_zone_1')
  }

  deleteAnchor(anchor_id) {
    let new_anchors = []
    for (let i=0; i < this.state.anchors.length; i++) {
      const anchor = this.state.anchors[i]
      if (anchor['id'] !== anchor_id) {
        new_anchors.push(anchor)
      }
    }
    this.setState({
      anchors: new_anchors,
    })
    this.doSave()
  }

  buildAnchorPics() {
    if (!this.state.anchors.length) {
      return (
        <div
            className='font-italic'
        >
          (none)
        </div>
      )
    }
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
          <div className='d-inline ml-2'>
            <button
                className='btn btn-link'
                onClick={() => this.deleteAnchor(anchor_id)}
            >
              delete
            </button>
          </div>
        </div>
      )
    }
    return return_arr
  }

  buildPlusMinus() {
    if (this.props.collapsible) {
      return (
        <div
            className='d-inline float-right'
        >
          <button
              className='btn btn-link'
              aria-expanded='false'
              data-target='#template_builder_body'
              aria-controls='template_builder_body'
              data-toggle='collapse'
              type='button'
          >
            +/-
          </button>
        </div>
      )
    }
    return ''
  }

  buildBodyClass() {
    if (this.props.collapsible) {
      return 'row collapse border-top m-2'
    } else {
      return 'row border-top m-2'
    }
  }

  render() {
    if (!this.props.getImageUrl()) {
      return ''
    }
    const plus_minus = this.buildPlusMinus()
    const body_class = this.buildBodyClass()
    const name_field = this.buildNameField()
    const load_button = this.buildLoadButton()
    const save_button = this.buildSaveButton()
    const delete_button = this.buildDeleteButton()
    const add_anchor_button = this.buildAddAnchorButton()
    const add_mask_zone_button = this.buildAddMaskZoneButton()
    const anchor_list = this.buildAnchorPics()
    const id_string = buildIdString(this.state.id, 'template', this.state.unsaved_changes)

    return (
      <div className='col bg-light rounded border'>
        <div className='row'>

          <div
            className='col-10 h3 float-left mt-2'
          >
            Manage Templates
          </div>
          {plus_minus}
        </div>

        <div
            id='template_builder_body'
            className={body_class}
        >

          <div className='col mb-3'>
            <div className='row mt-2'>
              {load_button}
              {save_button}
              {delete_button}
              {add_anchor_button}
              {add_mask_zone_button}
            </div>

            <div className='row mt-2'>
              {id_string}
            </div>

            <div className='row mt-2'>
              {name_field}
            </div>

            <div className='row mt-2'>
              <div className='col-lg-12 h5 border-top border-bottom p-4'>
                Anchors
              </div>
              <div className='col-lg-12'>
                {anchor_list}
              </div>
            </div>


          </div>
        </div>
      </div>
    )
  }
}

export default SimpleTemplateBuilderControls
