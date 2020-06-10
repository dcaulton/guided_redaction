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
      num_distractions_per_image : 40,
      testing_image_skip_factor: 10,
      normalize: true,
      only_test_positives: false,
      is_frozen: false,
      c_for_svm: '.01',
      global_scale: '.5',
      minimum_probability: '.7',
      scale: '1:1',
      sliding_window_step_size: 4,
      training_images: {},
      testing_images: {},
      testing_results_images: {},
      hard_negatives: {},
      classifier_path: '',
      features_path: '',
      attributes: {},
      unsaved_changes: false,
    }
    this.setLocalStateVar=this.setLocalStateVar.bind(this)
    this.getHogRuleFromState=this.getHogRuleFromState.bind(this)
    this.setLocalStateVarNoWarning=this.setLocalStateVarNoWarning.bind(this)
    this.addTrainingImage=this.addTrainingImage.bind(this)
    this.addTestingImage=this.addTestingImage.bind(this)
    this.trainingImageCropDone=this.trainingImageCropDone.bind(this)
    this.testingImageCropDone=this.testingImageCropDone.bind(this)
    this.getCurrentHogTrainingImageLocations=this.getCurrentHogTrainingImageLocations.bind(this)
    this.getCurrentHogTestingImageLocations=this.getCurrentHogTestingImageLocations.bind(this)
  }

  componentDidMount() {
    this.props.addInsightsCallback('hog_pick_training_image_2', this.addTrainingImage)
    this.props.addInsightsCallback('hog_pick_testing_image_1', this.addTestingImage)
    this.props.addInsightsCallback('getCurrentHogTrainingImageLocations', this.getCurrentHogTrainingImageLocations)
    this.props.addInsightsCallback('getCurrentHogTestingImageLocations', this.getCurrentHogTestingImageLocations)
    this.loadNewHogMeta()
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

  trainingImageCropDone(response) {
    const image_id = response['anchor_id']
    let deepCopyTrainingImages = JSON.parse(JSON.stringify(this.state.training_images))
    deepCopyTrainingImages[image_id]['cropped_image_bytes'] = response['cropped_image_bytes']
    this.setLocalStateVar('training_images', deepCopyTrainingImages)
  }

  testingImageCropDone(response) {
    const match_object_id = response['anchor_id']
    const image_bytes = response['cropped_image_bytes']
    let deepCopyTestingResultsImages = JSON.parse(JSON.stringify(this.state.testing_results_images))
    if (!Object.keys(deepCopyTestingResultsImages).includes(match_object_id)) {
      console.log('was expecting to see a testing_results_images object for '+match_object_id)
      return
    }
    deepCopyTestingResultsImages[match_object_id]['cropped_image_bytes'] = image_bytes
    this.setLocalStateVar('testing_results_images', deepCopyTestingResultsImages)
  }

  async addTestResponseImage(image_data) {
    let resp = this.props.cropImage(
      image_data['image_url'],
      image_data['start'],
      image_data['end'],
      image_data['id'],
      this.testingImageCropDone
    )
    await resp
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
      this.trainingImageCropDone
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
      num_distractions_per_image : this.state.num_distractions_per_image,
      testing_image_skip_factor: this.state.testing_image_skip_factor,
      normalize: this.state.normalize,
      only_test_positives: this.state.only_test_positives,
      is_frozen: this.state.is_frozen,
      c_for_svm: this.state.c_for_svm,
      global_scale: this.state.global_scale,
      minimum_probability : this.state.minimum_probability,
      scale: this.state.scale,
      sliding_window_step_size: this.state.sliding_window_step_size,
      training_images: this.state.training_images,
      testing_images: this.state.testing_images,
      hard_negatives: this.state.hard_negatives,
      classifier_path: this.state.classifier_path,
      features_path: this.state.features_path,
      attributes: this.state.attributes,
    }
    return hog_rule
  }

  doSave(when_done=(()=>{})) {
    doTier1Save(
      'hog',
      this.getHogRuleFromState,
      this.props.displayInsightsMessage,
      this.props.tier_1_scanners,
      this.props.tier_1_scanner_current_ids,
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

  buildSlidingWindowStepSizeField() {
    return buildLabelAndTextInput(
      this.state.sliding_window_step_size,
      'Sliding window step size',
      'hog_sliding_window_step_size',
      'sliding_window_step_size',
      5,
      ((value)=>{this.setLocalStateVar('sliding_window_step_size', value)})
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

  buildNumDistractionsPerImageField() {
    return buildLabelAndTextInput(
      this.state.num_distractions_per_image,
      'Num distractions per image',
      'hog_num_distractions_per_image',
      'num_distractions_per_image',
      5,
      ((value)=>{this.setLocalStateVar('num_distractions_per_image', value)})
    )
  }

  buildTestingImageSkipFactorField() {
    return buildLabelAndTextInput(
      this.state.testing_image_skip_factor,
      'Testing image skip factor',
      'hog_testing_image_skip_factor',
      'testing_image_skip_factor',
      5,
      ((value)=>{this.setLocalStateVar('testing_image_skip_factor', value)})
    )
  }

  buildCForSvmField() {
    return buildLabelAndTextInput(
      this.state.c_for_svm,
      'C for SVM',
      'hog_c_for_svm',
      'c_for_svm',
      5,
      ((value)=>{this.setLocalStateVar('c_for_svm', value)})
    )
  }

  buildGlobalScaleField() {
    return buildLabelAndTextInput(
      this.state.global_scale,
      'Global scale',
      'hog_global_scale',
      'global_scale',
      5,
      ((value)=>{this.setLocalStateVar('global_scale', value)})
    )
  }

  buildMinimumProbabilityField() {
    return buildLabelAndTextInput(
      this.state.minimum_probability,
      'Minimum probability',
      'hog_minimum_probability',
      '',
      '.7',
      ((value)=>{this.setLocalStateVar('minimum_probability', value)})
    )
  }

  buildScaleDropdown() {
    const scale_values = [
      {'1:1': 'actual image scale only'},
      {'+/-10/1': '+/- 10%, 1% increments'},
      {'+/-10/5': '+/- 10%, 5% increments'},
      {'+/-10/10': '+/- 10%, 10% increments'},
      {'+/-20/1': '+/- 20%, 1% increments'},
      {'+/-20/10': '+/- 20%, 10% increments'},
      {'+/-20/20': '+/- 20%, 20% increments'},
      {'+/-20/': '+/- 20%, 5% increments'},
      {'+/-25/1': '+/- 25%, 1% increments'},
      {'+/-25/5': '+/- 25%, 5% increments'},
      {'+/-40/1': '+/- 40%, 1% increments'},
      {'+/-40/5': '+/- 40%, 5% increments'},
      {'+/-50/1': '+/- 50%, 1% increments'},
      {'+/-50/5': '+/- 50%, 5% increments'},
      {'+/-50/10': '+/- 50%, 10% increments'}
    ]
    return buildLabelAndDropdown(
      scale_values,
      'Scale',
      this.state.scale,
      'hog_scale',
      ((value)=>{this.setLocalStateVar('scale', value)})
    )
  }

  buildNormalizeDropdown() {
    const values = [
      {true: 'yes'},
      {false: 'no'}
    ]
    return buildLabelAndDropdown(
      values,
      'Normalize images during training',
      this.state.normalize,
      'hog_normalize',
      ((value)=>{this.setLocalStateVar('normalize', value)})
    )
  }

  buildOnlyTestPositivesDropdown() {
    const values = [
      {true: 'yes'},
      {false: 'no'}
    ]
    return buildLabelAndDropdown(
      values,
      'Only test positive testing images',
      this.state.only_test_positives,
      'hog_only_test_positives',
      ((value)=>{this.setLocalStateVar('only_test_positives', value)})
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
        num_distractions_per_image: hog['num_distractions_per_image'],
        testing_image_skip_factor: hog['testing_image_skip_factor'],
        normalize: hog['normalize'],
        only_test_positives: hog['only_test_positives'],
        is_frozen: hog['is_frozen'],
        c_for_svm: hog['c_for_svm'],
        global_scale: hog['global_scale'],
        minimum_probability: hog['minimum_probability'],
        scale: hog['scale'],
        sliding_window_step_size: hog['sliding_window_sttep_size'],
        training_images: hog['training_images'],
        testing_images: hog['testing_images'],
        hard_negatives: hog['hard_negatives'],
        classifier_path: hog['classifier_path'],
        features_path: hog['features_path'],
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
    const hog_id = 'hog_' + Math.floor(Math.random(1000000, 9999999)*1000000000).toString()
    this.props.setGlobalStateVar('tier_1_scanner_current_ids', deepCopyIds)
    this.setState({
      id: hog_id,
      name: '',
      orientations: 9,
      pixels_per_cell: 8,
      cells_per_block: 2,
      num_distractions_per_image: 40,
      testing_image_skip_factor: 10,
      normalize: true,
      only_test_positives: false,
      is_frozen: false,
      c_for_svm: '.01',
      global_scale: '.5',
      minimum_probability: '.7',
      scale: '1:1',
      sliding_window_step_size: 4,
      training_images: {},
      testing_images: {},
      hard_negatives: {},
      classifier_path: '',
      features_path: '',
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

  buildFreezeButton() {
    if (this.state.is_frozen) {
      return ''
    }
    return (
      <button
          className='btn btn-primary ml-2 mt-2'
          onClick={() => this.freezeModel()}
      >
        Freeze
      </button>
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
    if (!Object.keys(this.props.tier_1_scanners['hog']).includes(this.state.id)) {
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
    this.doSave((()=>{}))
    this.props.submitInsightsJob('hog_train_model')
  }

  freezeModel() {
    let tis = {}
    const parent_id = this.state.id

    let deepCopyAttributes = JSON.parse(JSON.stringify(this.state.attributes))
    deepCopyAttributes['parent_id'] = parent_id
    const datetime_str = new Date().toLocaleString()
    deepCopyAttributes['freeze_date'] = datetime_str
    
    const hog_id = 'hog_' + Math.floor(Math.random(1000000, 9999999)*1000000000).toString()
    const new_name = this.state.name + '_frozen'
    const ti_keys = Object.keys(this.state.training_images)
    if (ti_keys.length > 0) {
      const one_ti = this.state.training_images[ti_keys[0]]
      tis[ti_keys[0]] = one_ti
    }
    this.setState({
      id: hog_id,
      name: new_name,
      training_images: tis,
      testing_images: {},
      testing_results_images: {},
      hard_negatives: {},
      attributes: deepCopyAttributes,
      is_frozen: true,
      unsaved_changes: true,
    })
    this.props.displayInsightsMessage('Model has been frozen')
  }

  buildTrainModelButton() {
    if (!this.state.training_images) {
      return
    }
    if (this.state.is_frozen) {
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
          const image_name = image['image_url'].split('/').slice(-1)[0]
          
          let goto_onclick = (()=>{})
          if (Object.keys(this.props.movies).includes(image['movie_url'])) {
            const the_movie = this.props.movies[image['movie_url']]
            const the_frameset = this.props.getFramesetHashForImageUrl(
              image['image_url'],
              the_movie['framesets']
            )
            const movie_framesets = this.props.getFramesetHashesInOrder(the_movie['framesets'])
            const image_frameset_index = movie_framesets.indexOf(the_frameset)
            goto_onclick = (() => this.showSourceFrame(image['movie_url'], image_frameset_index))
          }

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
                    onClick={goto_onclick}
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
          
        let goto_onclick = (()=>{})
        if (Object.keys(this.props.movies).includes(image['movie_url'])) {
          const the_movie = this.props.movies[image['movie_url']]
          const the_frameset = this.props.getFramesetHashForImageUrl(
            image['image_url'],
            the_movie['framesets']
          )
          const movie_framesets = this.props.getFramesetHashesInOrder(the_movie['framesets'])
          const image_frameset_index = movie_framesets.indexOf(the_frameset)
          goto_onclick = (() => this.showSourceFrame(image['movie_url'], image_frameset_index))
        }

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
                    onClick={goto_onclick}
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

  buildHardNegativesList() {
    if (!this.state.hard_negatives) {
      return (
        <div className='font-italic'>
          none
        </div>
      )
    }
    return (
      <div>
        <div className='col'>
        {Object.keys(this.state.hard_negatives).map((match_key, index) => {
          const img_bytes = this.state.hard_negatives[match_key]['cropped_image_bytes']
          const the_src = "data:image/gif;base64," + img_bytes
          return (
            <div 
                className='row border-top p-2'
                key={index}
            >
              <div className='col-lg-6'>
                <img
                  alt={match_key}
                  src={the_src}
                />
              </div>
              <div className='col-lg-2'>
                <button
                    className='btn btn-primary ml-2 mt-2'
                    onClick={() => this.deleteHardNegative(match_key)}
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

  buildTrainingImagesTitle() {
    return `
        Training images are what the detector 
        uses to learn what you want to 
        identify.

        In selecting your training images, specify a 
        box around the entire region of interest.  
        Specifying a little padding is optional but 
        it can help overall.  If the region of interest 
        occurs multiple times in a frame, you must 
        pick all of them.  
    `
  }

  buildTestingImagesTitle() {
    return `
        Testing images are what you specify to verify 
        the model is doing a good job with positive 
        and negative identification of your field.

        Here you specify the center of regions of 
        interest of a page.  The system will assume 
        all these should be matched as you train the 
        model, any that are not will be presented to 
        you as a potential issue in the 'run training' 
        section after training completes.
    `
  }

  buildHardNegativesTitle() {
    return `
        Here is where you actually kick off the training 
        and retraining processes.  This workflow is 
        iterative - the first time you just press 'train 
        model'.  When that job finishes, you will be 
        presented with a list of matches, and potentially 
        misses for training images you specified that 
        were not located using this detector.

        You should review the images, mark the ones 
        misidentified as your region as hard negatives, 
        potentially add some more testing imates, and 
        rerun.  When the system returns no errors, press 
        'finalize model'.
    `
  }

  loadTrainingJobImages() {
    let testing_results_images = {}
    const matches = this.props.tier_1_matches['hog_training'][this.state.id]
    for (let i=0; i < Object.keys(matches['movies']).length; i++) {
      const movie_url = Object.keys(matches['movies'])[i]
      const movie = matches['movies'][movie_url]
      for (let j=0; j < Object.keys(movie['framesets']).length; j++) {
        const frameset_hash = Object.keys(movie['framesets'])[j]
        const frameset = movie['framesets'][frameset_hash]
        for (let k=0; k < Object.keys(frameset).length; k++) {
          const object_key = Object.keys(frameset)[k]
          const match_object = frameset[object_key]
          const new_obj = {
            id: match_object['id'], 
            image_url: match_object['image_url'], 
            movie_url: movie_url,
            start: match_object['start'], 
            end: match_object['end'], 
          }
          testing_results_images[match_object['id']] = new_obj
        }
      }
    }
    this.setLocalStateVar('testing_results_images', testing_results_images)
    for (let i=0; i < Object.keys(testing_results_images).length; i++) {
      const object_key = Object.keys(testing_results_images)[i]
      const match_object = testing_results_images[object_key]
      this.addTestResponseImage(match_object)
    }
  }

  buildLoadHardNegativesDialog() {
    if (this.state.is_frozen) {
      return
    }
    return (
      <div>
        <div className='d-inline ml-2'>
          <button
              className='btn btn-primary ml-2 mt-2'
              onClick={() => this.loadTrainingJobImages()}
          >
            Load Training Data
          </button>
        </div>
      </div>
    )
  }

  makeHardNegative(match_key) {
    let deepCopyHardNegatives = JSON.parse(JSON.stringify(this.state.hard_negatives))
    let deepCopyTestingResultsImages = JSON.parse(JSON.stringify(this.state.testing_results_images))
    deepCopyHardNegatives[match_key] = deepCopyTestingResultsImages[match_key]
    delete deepCopyTestingResultsImages[match_key]
    this.setState({
      testing_results_images: deepCopyTestingResultsImages,
      hard_negatives: deepCopyHardNegatives,
    })
  }

  addTestingResultsImageToTraining(match_key) {
    let deepCopyTrainingImages = JSON.parse(JSON.stringify(this.state.training_images))
    let deepCopyTestingResultsImages = JSON.parse(JSON.stringify(this.state.testing_results_images))
    deepCopyTrainingImages[match_key] = deepCopyTestingResultsImages[match_key]
    delete deepCopyTestingResultsImages[match_key]
    this.setState({
      testing_results_images: deepCopyTestingResultsImages,
      training_images: deepCopyTrainingImages,
    })
  }

  dismissTestingResultsImage(match_key) {
    let deepCopyTestingResultsImages = JSON.parse(JSON.stringify(this.state.testing_results_images))
    delete deepCopyTestingResultsImages[match_key]
    this.setLocalStateVar('testing_results_images', deepCopyTestingResultsImages)
  }

  deleteHardNegative(match_key) {
    let deepCopyHardNegatives = JSON.parse(JSON.stringify(this.state.hard_negatives))
    delete deepCopyHardNegatives[match_key]
    this.setLocalStateVar('hard_negatives', deepCopyHardNegatives)
  }

  buildTestingResultsList() {
    if (!this.state.testing_results_images) {
      return (
        <div className='font-italic'>
          none
        </div>
      )
    }
    return (
      <div>
        <div className='col'>
        {Object.keys(this.state.testing_results_images).map((match_key, index) => {
          let the_src = ''
          if (Object.keys(this.state.testing_results_images[match_key]).includes('cropped_image_bytes')) {
            const img_bytes = this.state.testing_results_images[match_key]['cropped_image_bytes']
            the_src = "data:image/gif;base64," + img_bytes
          }
          return (
            <div 
                className='row border-top p-2'
                key={index}
            >
              <div className='col-lg-6'>
                <img
                  alt={match_key}
                  src={the_src}
                />
              </div>
              <div className='col-lg-2'>
                <button
                    className='btn btn-primary ml-2 mt-2'
                    onClick={() => this.makeHardNegative(match_key)}
                >
                  Add Hard Negative Training Image
                </button>
              </div>
              <div className='col-lg-2'>
                <button
                    className='btn btn-primary ml-2 mt-2'
                    onClick={() => this.dismissTestingResultsImage(match_key)}
                >
                  Dismiss
                </button>
              </div>
              <div className='col-lg-2'>
                <button
                    className='btn btn-primary ml-2 mt-2'
                    onClick={() => this.addTestingResultsImageToTraining(match_key)}
                >
                  Add Positive Training Image
                </button>
              </div>
            </div>
          )

        })}
        </div>
      </div>
    )
  }


  buildClassifierPath() {
    if (!this.state.classifier_path) {
      return ''
    }
    return (
      <div>
        <div className='d-inline'>
          Classifier Path: 
        </div>
        <div className='d-inline ml-2'>
          {this.state.classifier_path}
        </div>
      </div>
    )
  }

  buildFeaturesPath() {
    if (!this.state.features_path) {
      return ''
    }
    return (
      <div>
        <div className='d-inline'>
          Features Path: 
        </div>
        <div className='d-inline ml-2'>
          {this.state.features_path}
        </div>
      </div>
    )
  }

  buildIsFrozenBanner() {
    if (this.state.is_frozen) {
      return (
        <div 
            className='h3 col-lg-12 text-white bg-dark'
        >
          
          FROZEN
        </div>
      )
    } 
    return ''
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
    const num_distractions_per_image_field = this.buildNumDistractionsPerImageField()
    const testing_image_skip_factor_field = this.buildTestingImageSkipFactorField()
    const c_for_svm_field = this.buildCForSvmField()
    const global_scale_field = this.buildGlobalScaleField()
    const minimum_probability_field = this.buildMinimumProbabilityField()
    const scale_dropdown = this.buildScaleDropdown()
//    const sliding_window_step_size_field = this.buildSlidingWindowStepSizeField()
    const sliding_window_step_size_field = 'sliding window step size field is broken'
    const normalize_dropdown = this.buildNormalizeDropdown()
    const only_test_positives_dropdown = this.buildOnlyTestPositivesDropdown()
    const is_frozen_banner = this.buildIsFrozenBanner()
    const load_button = this.buildLoadButton()
    const delete_button = this.buildDeleteButton()
    const run_button = this.buildRunButton()
    const freeze_button = this.buildFreezeButton()
    const attributes_list = this.buildAttributesList()
    const show_hide_general = makePlusMinusRowLight('general', 'hog_general_div')
    const show_hide_training_images = makePlusMinusRowLight('select training images', 'hog_training_images_div')
    const show_hide_testing_images = makePlusMinusRowLight('select testing images', 'hog_testing_images_div')
    const show_hide_hard_negatives = makePlusMinusRowLight('run training / hard negatives', 'hog_hard_negatives_div')
    const pick_training_image_button = this.buildPickImageButton('training')
    const training_image_list = this.buildTrainingImageList()
    const pick_testing_image_button = this.buildPickImageButton('testing')
    const testing_image_list = this.buildTestingImageList()
    const hard_negatives_list = this.buildHardNegativesList()
    const testing_results_list = this.buildTestingResultsList()
    const train_model_button = this.buildTrainModelButton()
    const training_images_title = this.buildTrainingImagesTitle()
    const testing_images_title = this.buildTestingImagesTitle()
    const hard_negatives_title = this.buildHardNegativesTitle()
    const load_hard_negatives_dialog = this.buildLoadHardNegativesDialog()
    const classifier_path = this.buildClassifierPath()
    const features_path = this.buildFeaturesPath()

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

                  <div className='row mt-2'>
                    {id_string}
                  </div>

                  <div className='row mt-2'>
                    {is_frozen_banner}
                  </div>

                  <div className='row mt-2'>
                    {name_field}
                  </div>

                  <div className='row mt-2'>
                    {orientations_field}
                  </div>

                  <div className='row mt-2'>
                    {pixels_per_cell_field}
                  </div>

                  <div className='row mt-2'>
                    {cells_per_block_field}
                  </div>

                  <div className='row mt-2'>
                    {num_distractions_per_image_field}
                  </div>

                  <div className='row mt-2'>
                    {testing_image_skip_factor_field}
                  </div>

                  <div className='row mt-2'>
                    {normalize_dropdown}
                  </div>

                  <div className='row mt-2'>
                    {only_test_positives_dropdown}
                  </div>

                  <div className='row mt-2'>
                    {c_for_svm_field}
                  </div>

                  <div className='row mt-2'>
                    {global_scale_field}
                  </div>

                  <div className='row mt-2'>
                    {minimum_probability_field}
                  </div>

                  <div className='row mt-2'>
                    {scale_dropdown}
                  </div>

                  <div className='row mt-2'>
                    {sliding_window_step_size_field}
                  </div>

                  <div className='row mt-2'>
                    {classifier_path}
                  </div>

                  <div className='row mt-2'>
                    {features_path}
                  </div>

                  <div className='row mt-2'>
                    {attributes_list}
                  </div>

                  <div className='row mt-2'>
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
                  <div className='row h5' title={training_images_title}>
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
                  <div className='row h5' title={testing_images_title}>
                    testing images
                  </div>
                  {pick_testing_image_button}
                  {testing_image_list}
                </div>

                {show_hide_hard_negatives}
                <div 
                    id='hog_hard_negatives_div'
                    className='collapse'
                >
                  
                  <div className='row h5' title={hard_negatives_title}>
                    hard negatives
                  </div>

                  <div className='row'>
                    {train_model_button}
                  </div>

                  <div className='row'>
                    {freeze_button}
                  </div>

                  <div className='row'>
                    {load_hard_negatives_dialog}
                  </div>

                  <div className='h5 mt-3'>
                    Testing results
                  </div>
                  {testing_results_list}

                  <div className='h5 mt-3'>
                    Hard Negatives
                  </div>
                  {hard_negatives_list}
                </div>

              </div>
            </div>

          </div>
        </div>
    )
  }
}

export default HogControls;
