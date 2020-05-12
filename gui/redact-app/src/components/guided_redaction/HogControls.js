import React from 'react';
import ScannerSearchControls from './ScannerSearchControls'
import {
  makeHeaderRow,
  buildInlinePrimaryButton,
  doTier1Save,
  buildTier1LoadButton,
  buildTier1DeleteButton,
  buildLabelAndTextInput,
  buildIdString,
  makePlusMinusRowLight,
  buildAttributesAddRow,
  buildAttributesAsRows,
  buildLabelAndDropdown,
} from './SharedControls'

class HogControls extends React.Component {

  constructor(props) {
    super(props)
    this.state = {
      id: '',
      name: '',
      orientations: 9,
      pixels_per_cell: 8,
      cells_per_block: 2,
      normalize: true,
      training_images: {},
      testing_images: {},
      attributes: {},
      unsaved_changes: false,
    }
    this.setLocalStateVar=this.setLocalStateVar.bind(this)
    this.getHogRuleFromState=this.getHogRuleFromState.bind(this)
    this.setLocalStateVarNoWarning=this.setLocalStateVarNoWarning.bind(this)
    this.addTrainingImage=this.addTrainingImage.bind(this)
    this.addTestingImage=this.addTestingImage.bind(this)
    this.imageCropDone=this.imageCropDone.bind(this)
    this.getCurrentHogTrainingImageLocations=this.getCurrentHogTrainingImageLocations.bind(this)
    this.getCurrentHogTestingImageLocations=this.getCurrentHogTestingImageLocations.bind(this)
  }

  componentDidMount() {
    this.props.addInsightsCallback('hog_pick_training_image_2', this.addTrainingImage)
    this.props.addInsightsCallback('hog_pick_testing_image_1', this.addTestingImage)
    this.props.addInsightsCallback('getCurrentHogTrainingImageLocations', this.getCurrentHogTrainingImageLocations)
    this.props.addInsightsCallback('getCurrentHogTestingImageLocations', this.getCurrentHogTestingImageLocations)
  }

  getCurrentHogTrainingImageLocations() {
    let locations = []
    for (let i=0; i < Object.keys(this.state.training_images).length; i++) {
      const ti_key = Object.keys(this.state.training_images)[i]
      const ti = this.state.training_images[ti_key]
      if (ti['image_url'] === this.props.insights_image) {
        const build_obj = {
          start: ti['start'],
          end: ti['end'],
        }
        locations.push(build_obj)
      }
    }
    return locations
  }

  getCurrentHogTestingImageLocations() {
    let locations = []
    for (let i=0; i < Object.keys(this.state.testing_images).length; i++) {
      const ti_key = Object.keys(this.state.testing_images)[i]
      const ti = this.state.testing_images[ti_key]
      if (ti['image_url'] === this.props.insights_image) {
        const build_obj = {
          location: ti['location'],
        }
        locations.push(build_obj)
      }
    }
    return locations
  }

  imageCropDone(response) {
    const image_id = response['anchor_id']
    let deepCopyTrainingImages = JSON.parse(JSON.stringify(this.state.training_images))
    deepCopyTrainingImages[image_id]['cropped_image_bytes'] = response['cropped_image_bytes']
    this.setLocalStateVar('training_images', deepCopyTrainingImages)
  }

  async addTrainingImage(end_coords) {
    const image_id = 'training_image_' + Math.floor(Math.random(1000000, 9999999)*1000000000).toString()
    let image_obj = {
      id: image_id,
      movie_url: this.props.movie_url,
      image_url: this.props.insights_image,
      start: this.props.clicked_coords,
      end: end_coords,
    }
    let deepCopyTrainingImages = JSON.parse(JSON.stringify(this.state.training_images))
    deepCopyTrainingImages[image_id] = image_obj
    this.setLocalStateVar('training_images', deepCopyTrainingImages)
    this.props.handleSetMode('hog_pick_training_image_1')
    let resp = this.props.cropImage(
      this.props.insights_image,
      this.props.clicked_coords,
      end_coords,
      image_id,
      this.imageCropDone
    )
    await resp
  }

  addTestingImage(the_coords) {
    const image_id = 'testing_image_' + Math.floor(Math.random(1000000, 9999999)*1000000000).toString()
    let image_obj = {
      id: image_id,
      movie_url: this.props.movie_url,
      image_url: this.props.insights_image,
      location: the_coords,
    }
    let deepCopyTestingImages = JSON.parse(JSON.stringify(this.state.testing_images))
    deepCopyTestingImages[image_id] = image_obj
    this.setLocalStateVar('testing_images', deepCopyTestingImages)
    this.props.handleSetMode('hog_pick_testing_image_1')
  }

  deleteTrainingImage(image_id) {
    let deepCopyTrainingImages = JSON.parse(JSON.stringify(this.state.training_images))
    delete deepCopyTrainingImages[image_id]
    this.setLocalStateVar('training_images', deepCopyTrainingImages)
  }

  deleteTestingImage(image_id) {
    let deepCopyTestingImages = JSON.parse(JSON.stringify(this.state.testing_images))
    delete deepCopyTestingImages[image_id]
    this.setLocalStateVar('testing_images', deepCopyTestingImages)
  }

  setLocalStateVar(var_name, var_value, when_done=(()=>{})) {
    this.setState({
      [var_name]: var_value,
      unsaved_changes: true,
    },
    when_done())
  }

  setLocalStateVarNoWarning(var_name, var_value, when_done=(()=>{})) {
    this.setState({
      [var_name]: var_value,
      unsaved_changes: false,
    },
    when_done())
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

  getHogRuleFromState() {
    const hog_rule = {
      id: this.state.id,
      name: this.state.name,
      orientations: this.state.orientations,
      pixels_per_cell: this.state.pixels_per_cell,
      cells_per_block: this.state.cells_per_block,
      normalize: this.state.normalize,
      training_images: this.state.training_images,
      testing_images: this.state.testing_images,
      attributes: this.state.attributes,
    }
    return hog_rule
  }

  doSave(when_done=(()=>{})) {
    doTier1Save(
      'hog',
      this.state.name,
      this.getHogRuleFromState,
      this.props.displayInsightsMessage,
      this.props.tier_1_scanners,
      this.props.tier_1_scanner_current_ids,
      this.setLocalStateVarNoWarning,
      this.props.setGlobalStateVar,
      when_done,
    )
  }

  async doSaveToDatabase() {
    this.doSave(((hog_rule) => {
      this.props.saveScannerToDatabase(
        'hog',
        hog_rule,
        (()=>{this.props.displayInsightsMessage('Hog rule has been saved to database')})
      )
    }))
  }

  buildNameField() {
    return buildLabelAndTextInput(
      this.state.name,
      'Name',
      'hog_name',
      'name',
      25,
      ((value)=>{this.setLocalStateVar('name', value)})
    )
  }

  buildOrientationsField() {
    return buildLabelAndTextInput(
      this.state.orientations,
      'Orientations',
      'hog_orientations',
      'orientations',
      5,
      ((value)=>{this.setLocalStateVar('orientations', value)})
    )
  }

  buildPixelsPerCellField() {
    return buildLabelAndTextInput(
      this.state.pixels_per_cell,
      'Pixels per cell',
      'hog_pixels_per_cell',
      'pixels_per_cell',
      5,
      ((value)=>{this.setLocalStateVar('pixels_per_cell', value)})
    )
  }

  buildCellsPerBlockField() {
    return buildLabelAndTextInput(
      this.state.cells_per_block,
      'Cells per block',
      'hog_cells_per_block',
      'cells_per_block',
      5,
      ((value)=>{this.setLocalStateVar('cells_per_block', value)})
    )
  }

  buildNormalizeDropdown() {
    const values = [
      {1: 'yes'},
      {0: 'no'}
    ]
    return buildLabelAndDropdown(
      values,
      'Normalize images during training',
      this.state.normalize,
      'hog_normalize',
      ((value)=>{this.setLocalStateVar('normalize', value)})
    )
  }

  buildLoadButton() {
    return buildTier1LoadButton(
      'hog',
      this.props.tier_1_scanners['hog'],
      ((value)=>{this.loadHogMeta(value)})
    )
  }

  loadHogMeta(hog_id) {
    if (!hog_id) {
      this.loadNewHogMeta()
    } else {
      const hog = this.props.tier_1_scanners['hog'][hog_id]
      this.setState({
        id: hog['id'],
        name: hog['name'],
        orientations: hog['orientations'],
        pixels_per_cell: hog['pixels_per_cell'],
        cells_per_block: hog['cells_per_block'],
        normalize: hog['normalize'],
        training_images: hog['training_images'],
        testing_images: hog['testing_images'],
        attributes: hog['attributes'],
        unsaved_changes: false,
      })
    }
    let deepCopyIds = JSON.parse(JSON.stringify(this.props.tier_1_scanner_current_ids))
    deepCopyIds['hog'] = hog_id
    this.props.setGlobalStateVar('tier_1_scanner_current_ids', deepCopyIds)
    this.props.displayInsightsMessage('Hog meta has been loaded')
  }

  loadNewHogMeta() {
    let deepCopyIds = JSON.parse(JSON.stringify(this.props.tier_1_scanner_current_ids))
    deepCopyIds['hog'] = ''
    this.props.setGlobalStateVar('tier_1_scanner_current_ids', deepCopyIds)
    this.setState({
      id: '',
      name: '',
      orientations: 9,
      pixels_per_cell: 8,
      cells_per_block: 2,
      normalize: true,
      training_images: {},
      testing_images: {},
      attributes: {},
      unsaved_changes: false,
    })
  }

  buildDeleteButton() {
    return buildTier1DeleteButton(
      'hog',
      this.props.tier_1_scanners['hog'],
      ((value)=>{this.deleteHogMeta(value)})
    )
  }

  deleteHogMeta(ef_id) {
    let deepCopyScanners = JSON.parse(JSON.stringify(this.props.tier_1_scanners))
    let deepCopyHogs = deepCopyScanners['hog']
    delete deepCopyHogs[ef_id]
    deepCopyScanners['hog'] = deepCopyHogs
    this.props.setGlobalStateVar('tier_1_scanners', deepCopyScanners)
    if (ef_id === this.props.tier_1_scanner_current_ids['hog']) {
      let deepCopyIds = JSON.parse(JSON.stringify(this.props.tier_1_scanner_current_ids))
      deepCopyIds['hog'] = ''
      this.props.setGlobalStateVar('tier_1_scanner_current_ids', deepCopyIds)
    }
    this.props.displayInsightsMessage('Hog meta was deleted')
  }

  buildRunButton() {
    if (!this.state.id) {                                                       
      return ''                                                                 
    }
    return (
      <div className='d-inline'>
        <button
            className='btn btn-primary ml-2 dropdown-toggle'
            type='button'
            id='scanHogDropdownButton'
            data-toggle='dropdown'
            area-haspopup='true'
            area-expanded='false'
        >
          Run
        </button>
        <div className='dropdown-menu' aria-labelledby='scanHogDropdownButton'>
          <button className='dropdown-item'
              onClick={() => this.props.submitInsightsJob('hog_current_frame')}
          >
            Frame
          </button>
          <button className='dropdown-item'
              onClick={() => this.props.submitInsightsJob('hog_current_movie')}
          >
            Movie
          </button>
          <button className='dropdown-item'
              onClick={() => this.props.submitInsightsJob('hog_all_movies')}
          >
            All Movies
          </button>
        </div>
      </div>
    )
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
    const value_ele = document.getElementById('hog_attribute_value')
    const name_ele = document.getElementById('hog_attribute_name')
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

  buildAttributesList() {
    const add_attr_row = buildAttributesAddRow(
      'hog_attribute_name',
      'hog_attribute_value',
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

  trainModel() {
    this.doSave()
    this.props.submitInsightsJob('hog_train_model')
  }

  buildTrainModelButton() {
    if (!this.state.training_images) {
      return
    }
    return (
      <button
          className='btn btn-primary ml-2 mt-2'
          onClick={() => this.trainModel()}
      >
        Train Model
      </button>
    )
  }

  buildPickImageButton(image_type) {
    let the_text = 'Pick Image Center'
    if (image_type === 'training') {
      the_text = 'Pick Image Corners'
    }
    const the_mode = 'hog_pick_' + image_type + '_image_1'
    if (!this.props.movie_url) {
      return
    }
    return (
      <button
          className='btn btn-primary ml-2 mt-2'
          onClick={() => this.props.handleSetMode(the_mode)}
      >
        {the_text}
      </button>
    )
  }

  showSourceFrame(movie_url, image_frameset_index) {
    if (movie_url !== this.props.movie_url) {
      this.props.setCurrentVideo(movie_url)
    }
    setTimeout((() => {this.props.setScrubberToIndex(image_frameset_index)}), 1000)
  }

  buildTestingImageList() {
    const image_keys = Object.keys(this.state.testing_images)
    return (
      <div>
        {image_keys.map((image_key, index) => {
          const image = this.state.testing_images[image_key]
          
        const the_movie = this.props.movies[image['movie_url']]
        const the_frameset = this.props.getFramesetHashForImageUrl(
          image['image_url'],
          the_movie['framesets']
        )
        const movie_framesets = this.props.getFramesetHashesInOrder(the_movie['framesets'])
        const image_frameset_index = movie_framesets.indexOf(the_frameset)
        const image_name = image['image_url'].split('/').slice(-1)[0]

          return (
            <div
                key={index}
            >
              <div className='d-inline'>
                {image_key}
              </div>
              <div className='d-inline ml-2'>
                {image_name}
              </div>
              <div className='d-inline ml-2'>
                <button
                    className='btn btn-link'
                    onClick={() => this.showSourceFrame(image['movie_url'], image_frameset_index)}
                >
                  goto
                </button>
              </div>
              <div className='d-inline ml-2'>
                <button
                    className='btn btn-link'
                    onClick={() => this.deleteTestingImage(image_key)}
                >
                  delete
                </button>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  buildTrainingImageList() {
    const image_keys = Object.keys(this.state.training_images)
    return (
      <div>
        {image_keys.map((image_key, index) => {
          const image = this.state.training_images[image_key]
          
        const the_movie = this.props.movies[image['movie_url']]
        const the_frameset = this.props.getFramesetHashForImageUrl(
          image['image_url'],
          the_movie['framesets']
        )
        const movie_framesets = this.props.getFramesetHashesInOrder(the_movie['framesets'])
        const image_frameset_index = movie_framesets.indexOf(the_frameset)

          let the_src = ''
          if (Object.keys(image).includes('cropped_image_bytes')) {
            the_src = "data:image/gif;base64," + image['cropped_image_bytes']
          }
          return (
            <div
                key={index}
            >
              <div className='d-inline'>
                {image_key}
              </div>
              <div className='d-inline ml-2'>
                <img
                  alt={image_key}
                  src={the_src}
                />
              </div>
              <div className='d-inline ml-2'>
                <button
                    className='btn btn-link'
                    onClick={() => this.showSourceFrame(image['movie_url'], image_frameset_index)}
                >
                  goto
                </button>
              </div>
              <div className='d-inline ml-2'>
                <button
                    className='btn btn-link'
                    onClick={() => this.deleteTrainingImage(image_key)}
                >
                  delete
                </button>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  render() {
    if (!this.props.visibilityFlags['hog']) {
      return([])
    }
    const header_row = makeHeaderRow(
      'hog',
      'hog_body',
      (() => this.props.toggleShowVisibility('hog'))
    )
    const id_string = buildIdString(this.state.id, 'hog', this.state.unsaved_changes)
    const save_button = this.buildSaveButton()
    const save_to_db_button = this.buildSaveToDatabaseButton()
    const name_field = this.buildNameField()
    const orientations_field = this.buildOrientationsField()
    const pixels_per_cell_field = this.buildPixelsPerCellField()
    const cells_per_block_field = this.buildCellsPerBlockField()
    const normalize_dropdown = this.buildNormalizeDropdown()
    const load_button = this.buildLoadButton()
    const delete_button = this.buildDeleteButton()
    const run_button = this.buildRunButton()
    const attributes_list = this.buildAttributesList()
    const show_hide_general = makePlusMinusRowLight('general', 'hog_general_div')
    const show_hide_training_images= makePlusMinusRowLight('training images', 'hog_training_images_div')
    const show_hide_testing_images= makePlusMinusRowLight('testing images', 'hog_testing_images_div')
    const show_hide_train_model = makePlusMinusRowLight('train model', 'hog_train_model_div')
    const pick_training_image_button = this.buildPickImageButton('training')
    const training_image_list = this.buildTrainingImageList()
    const pick_testing_image_button = this.buildPickImageButton('testing')
    const testing_image_list = this.buildTestingImageList()
    const train_model_button = this.buildTrainModelButton()

    return (
        <div className='row bg-light rounded mt-3'>
          <div className='col'>

            {header_row}

            <div 
                id='hog_body' 
                className='row collapse pb-2 ml-1 mr-1'
            >
              <div id='hog_main' className='col'>

                {show_hide_general}
                <div 
                    id='hog_general_div'
                    className='collapse'
                >
                  <div className='row mt-2'>
                    {load_button}
                    {delete_button}
                    {save_button}
                    {save_to_db_button}
                    {run_button}
                  </div>

                  <div className='row bg-light'>
                    {id_string}
                  </div>

                  <div className='row bg-light'>
                    {name_field}
                  </div>

                  <div className='row bg-light'>
                    {attributes_list}
                  </div>

                  <div className='row bg-light border-top'>
                    <ScannerSearchControls
                      search_attribute_name_id='hog_database_search_attribute_name'
                      search_attribute_value_id='hog_database_search_attribute_value'
                      getScanners={this.props.getScanners}
                      importScanner={this.props.importScanner}
                      deleteScanner={this.props.deleteScanner}
                      scanners={this.props.scanners}
                      displayInsightsMessage={this.props.displayInsightsMessage}
                      search_type='hog'
                    />
                  </div>
                </div>

                {show_hide_training_images}
                <div 
                    id='hog_training_images_div'
                    className='collapse'
                >
                  <div className='row h5'>
                    training images
                  </div>
                  {pick_training_image_button}
                  {training_image_list}
                </div>

                {show_hide_testing_images}
                <div 
                    id='hog_testing_images_div'
                    className='collapse'
                >
                  <div className='row h5'>
                    testing images
                  </div>
                  {pick_testing_image_button}
                  {testing_image_list}
                </div>


                {show_hide_train_model}
                <div 
                    id='hog_train_model_div'
                    className='collapse'
                >
                  <div className='row bg-light'>
                    {orientations_field}
                  </div>

                  <div className='row bg-light'>
                    {pixels_per_cell_field}
                  </div>

                  <div className='row bg-light'>
                    {cells_per_block_field}
                  </div>

                  <div className='row bg-light'>
                    {normalize_dropdown}
                  </div>

                  <div className='row bg-light'>
                    {train_model_button}
                  </div>

                </div>

              </div>
            </div>

          </div>
        </div>
    )
  }
}

export default HogControls;
