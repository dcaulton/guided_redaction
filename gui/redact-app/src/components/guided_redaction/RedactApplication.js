import React from 'react';
import ImagePanel from './ImagePanel';
import MoviePanel from './MoviePanel';
import InsightsPanel from './InsightsPanel';
import ComposePanel from './ComposePanel';
import {getUrlVars} from './redact_utils.js'
import CompositeTone from './Tones.js'
import './styles/guided_redaction.css';
import { fetch } from '../../utils'; 
import {
  Switch,
  Route,
  Link
} from "react-router-dom";
let helpDoc = ''

class RedactApplication extends React.Component {
  constructor(props) {
    super(props);
    const api_server_url = ''
    const api_key = ''
    this.state = {
      api_server_url: api_server_url,
      api_key: api_key,
      frameset_discriminator: 'gray8',
      mask_method: 'black_rectangle',
      movie_url: '',
      frameset_hash: '',
      image_width: 0,
      image_height: 0,
      image_scale: 1,
      current_workbook_name: 'workbook 1',
      current_workbook_id: '',
      workbooks: [],
      movies: {},
      movie_sets: {},
      annotations: {},
      jobs: [],
      scanners: [],
      files: {},
      subsequences: {},
      showMovieParserLink: true,
      showInsightsLink: true,
      showComposeLink: true,
      whenJobLoaded: {},
      whenDoneTarget: '',
      campaign_movies: [],
      illustrateParameters: {
        color: '#CCCC00',
        backgroundDarkenPercent: .5,
        lineWidth: 5,
      },
      attached_job: {
        id: '',
        status: '',
        percent_done: '',
      },
      preserveAllJobs: false,
      telemetry_data: {
        raw_data_url: '',
        movie_mappings: [],
      },
      pipelines: {},
      results: {},
      maximize: false,
      current_pipeline_id: '',
      preserve_movie_audio: false,
      app_codebooks: {},
      user: {},
      session_audio: {
        playSound: true,
        userTone: 'blip',
        voice: {
          index: '',
          pitch: '',
          rate: '',
        },
      },
      message: '',
      visibilityFlags: {
        'templates': true,
        'hog': true,
        'selectedArea': true,
        'annotate': true,
        'telemetry': true,
        'filesystem': true,
        'ocr': true,
        'ocr_scene_analysis': true,
        'ocr_movie_analysis': true,
        'movieSets': true,
        'results': true,
        'diffs': true,
        'redact': true,
        'zip': true,
        'pipelines': true,
        'entity_finder': true,
      },
      tier_1_scanners: {
        'ocr': {},
        'hog': {},
        'ocr_scene_analysis': {},
        'ocr_movie_analysis': {},
        'template': {},
        'telemetry': {},
        'selected_area': {},
        'entity_finder': {},
      },
      tier_1_scanner_current_ids: {
        'ocr': '',
        'hog': '',
        'ocr_scene_analysis': '',
        'ocr_movie_analysis': '',
        'template': '',
        'telemetry': '',
        'selected_area': '',
        'entity_finder': '',
      },
      tier_1_matches: {
        'ocr': {},
        'hog': {},
        'hog_training': {},
        'ocr_scene_analysis': {},
        'ocr_movie_analysis': {},
        'template': {},
        'telemetry': {},
        'selected_area': {},
        'entity_finder': {},
      },
    }

    this.getNextImageHash=this.getNextImageHash.bind(this)
    this.getPrevImageHash=this.getPrevImageHash.bind(this)
    this.handleMergeFramesets=this.handleMergeFramesets.bind(this)
    this.setImageScale=this.setImageScale.bind(this)
    this.doPing=this.doPing.bind(this)
    this.doGetVersion=this.doGetVersion.bind(this)
    this.cancelJob=this.cancelJob.bind(this)
    this.submitJob=this.submitJob.bind(this)
    this.getJobs=this.getJobs.bind(this)
    this.getFiles=this.getFiles.bind(this)
    this.getPipelines=this.getPipelines.bind(this)
    this.dispatchPipeline=this.dispatchPipeline.bind(this)
    this.deleteFile=this.deleteFile.bind(this)
    this.deletePipeline=this.deletePipeline.bind(this)
    this.savePipelineToDatabase=this.savePipelineToDatabase.bind(this)
    this.loadJobResults=this.loadJobResults.bind(this)
    this.getWorkbooks=this.getWorkbooks.bind(this)
    this.saveWorkbook=this.saveWorkbook.bind(this)
    this.saveWorkbookName=this.saveWorkbookName.bind(this)
    this.loadWorkbook=this.loadWorkbook.bind(this)
    this.deleteWorkbook=this.deleteWorkbook.bind(this)
    this.setSelectedAreaMetas=this.setSelectedAreaMetas.bind(this)
    this.afterUuidImagesFetched=this.afterUuidImagesFetched.bind(this)
    this.cropImage=this.cropImage.bind(this)
    this.setMovieNickname=this.setMovieNickname.bind(this)
    this.setMovieRedactedUrl=this.setMovieRedactedUrl.bind(this)
    this.getCurrentFramesets=this.getCurrentFramesets.bind(this)
    this.getCurrentFrames=this.getCurrentFrames.bind(this)
    this.setActiveMovie=this.setActiveMovie.bind(this)
    this.getRedactedMovieUrl=this.getRedactedMovieUrl.bind(this)
    this.clearCurrentFramesetChanges=this.clearCurrentFramesetChanges.bind(this)
    this.getFramesetHashesInOrder=this.getFramesetHashesInOrder.bind(this)
    this.getImageFromFrameset=this.getImageFromFrameset.bind(this)
    this.getRedactedImageFromFrameset=this.getRedactedImageFromFrameset.bind(this)
    this.gotoWhenDoneTarget=this.gotoWhenDoneTarget.bind(this)
    this.updateGlobalState=this.updateGlobalState.bind(this)
    this.watchForJob=this.watchForJob.bind(this)
    this.unwatchJob=this.unwatchJob.bind(this)
    this.checkForJobs=this.checkForJobs.bind(this)
    this.playTone=this.playTone.bind(this)
    this.checkIfApiCanSeeUrl=this.checkIfApiCanSeeUrl.bind(this)
    this.checkIfGuiCanSeeUrl=this.checkIfGuiCanSeeUrl.bind(this)
    this.updateSingleImageMovie=this.updateSingleImageMovie.bind(this)
    this.postMakeUrlCall=this.postMakeUrlCall.bind(this)
    this.establishNewMovie=this.establishNewMovie.bind(this)
    this.establishNewEmptyMovie=this.establishNewEmptyMovie.bind(this)
    this.setCampaignMovies=this.setCampaignMovies.bind(this)
    this.addImageToMovie=this.addImageToMovie.bind(this)
    this.setIllustrateParameters=this.setIllustrateParameters.bind(this)
    this.getImageUrl=this.getImageUrl.bind(this)
    this.setFramesetHash=this.setFramesetHash.bind(this)
    this.setTelemetryData=this.setTelemetryData.bind(this)
    this.getJobResultData=this.getJobResultData.bind(this)
    this.setGlobalStateVar=this.setGlobalStateVar.bind(this)
    this.toggleGlobalStateVar=this.toggleGlobalStateVar.bind(this)
    this.saveScannerToDatabase=this.saveScannerToDatabase.bind(this)
    this.getScanners=this.getScanners.bind(this)
    this.deleteScanner=this.deleteScanner.bind(this)
    this.importScanner=this.importScanner.bind(this)
    this.wrapUpJob=this.wrapUpJob.bind(this)
    this.attachToJob=this.attachToJob.bind(this)
    this.readTelemetryRawData=this.readTelemetryRawData.bind(this)
    this.toggleShowVisibility=this.toggleShowVisibility.bind(this)
    this.impersonateUser=this.impersonateUser.bind(this)
    this.getAndSaveUser=this.getAndSaveUser.bind(this)
  }

  impersonateUser(new_user_id) {
    let deepCopyUser = JSON.parse(JSON.stringify(this.state.user))
    deepCopyUser['id'] = new_user_id
    this.setGlobalStateVar('user', deepCopyUser)
    this.processUserClasses()
  }

  getAndSaveUser() {
    const user_id = this.getCurrentUser()
    if (!user_id) {
      return
    }
    const user_classes = this.getUserClasses(user_id)
    let user_object = {
      id: user_id,
      classes: user_classes,
    }
    this.setGlobalStateVar('user', user_object)
    return user_object
  }

  getUserClasses(user_id) {
    let classes = []
    if (user_id === 'dave.caulton@sykes.com') {
      classes.push('davecaulton')
    }
    if ((user_id === 'michael.taylor@sykes.com') ||
        (user_id === 'something.else@sykes.com') ||
        (user_id === 'david.barrios@sykes.com') ||
        (user_id === 'scott.devos@sykes.com') ||
        (user_id === 'ryan.cannon@sykes.com') ||
        (user_id === 'shelton.hook@sykes.com')) {
      classes.push('no_sound')
    }
    return classes
  }

  processUserClasses() {
    if (!this.state.user) {
      return []
    }
    if (!this.state.user['classes']) {
      return []
    }

    for (let i=0; i< this.state.user['classes'].length; i++) {
      const class_name = this.state.user_classes[i]
      this.processUserClass(class_name)
    }
  }

  processUserClass(class_name) {
    if (class_name === 'no_sound') {
      let deepCopySessionAudio = JSON.parse(JSON.stringify(this.state.session_audio))
      deepCopySessionAudio['playSound']  = false
      this.setGlobalStateVar('session_audio', deepCopySessionAudio)
    }
  }

  getUrl(url_name) {
    let api_server_url = ''
    api_server_url = this.props.getBaseUrl()

    if (url_name === 'ping_url') {
      return api_server_url + 'v1/parse/ping'
    } else if (url_name === 'crop_url') {
      return api_server_url + 'v1/parse/crop-image'
    } else if (url_name === 'get_images_for_uuid_url') {
      return api_server_url + 'v1/parse/get-images-for-uuid'
    } else if (url_name === 'jobs_url') {
      return api_server_url + 'v1/jobs'
    } else if (url_name === 'wrap_up_job_url') {
      return api_server_url + 'v1/wrap-up-jobs'
    } else if (url_name === 'workbooks_url') {
      return api_server_url + 'v1/workbooks'
    } else if (url_name === 'link_url') {
      return api_server_url + 'v1/link/learn-dev'
    } else if (url_name === 'can_see_url') {
      return api_server_url + 'v1/link/can-reach'
    } else if (url_name === 'make_url_url') {
      return api_server_url + 'v1/files/make-url'
    } else if (url_name === 'scanners_url') {
      return api_server_url + 'v1/scanners'
    } else if (url_name === 'get_telemetry_rows') {
      return api_server_url + 'v1/link/get-telemetry-rows'
    } else if (url_name === 'files_url') {
      return api_server_url + 'v1/files'
    } else if (url_name === 'pipelines_url') {
      return api_server_url + 'v1/pipelines'
    } else if (url_name === 'version_url') {
      return api_server_url + 'v1/files/get-version'
    }
  }

  toggleShowVisibility(flag_name) {
    let deepCopyVisibilityFlags= JSON.parse(JSON.stringify(this.state.visibilityFlags))
    if (Object.keys(deepCopyVisibilityFlags).includes(flag_name)) {
      const new_value = (!deepCopyVisibilityFlags[flag_name])
      deepCopyVisibilityFlags[flag_name] = new_value
    }
    this.setState({
      visibilityFlags: deepCopyVisibilityFlags,
    })
  }

  setGlobalStateVar(var_name, var_value, when_done=(()=>{})) {
    this.setState({
      [var_name]: var_value,
    },
    when_done())
  }

  async readTelemetryRawData(transaction_id, when_done=(()=>{})) {
    if (!this.state.telemetry_data || !Object.keys(this.state.telemetry_data).includes('raw_data_url')) {
      when_done([])
    }
    let response = await fetch(this.getUrl('get_telemetry_rows'), {
      method: 'POST',
      headers: this.buildJsonHeaders(),
      body: JSON.stringify({
        raw_data_url: this.state.telemetry_data['raw_data_url'],
        transaction_id: transaction_id,
      }),
    })
    .then((response) => response.json())
    .then((responseJson) => {
      when_done(responseJson['lines'])
    })
    .catch((error) => {
      console.error(error)
    })
    await response
  }

  toggleGlobalStateVar(var_name) {
    const new_value = (!this.state[var_name])
    this.setState({
      [var_name]: new_value,
    })
  }

  setTelemetryData(hash_in, when_done=(()=>{}), when_failed=(()=>{})) {
    if (Object.keys(hash_in).includes('raw_data_url')) {
      let raw_data_filename = hash_in['raw_data_filename']
      this.postMakeUrlCall({                                                                                  
        data_uri: hash_in['raw_data_url'],
        filename: raw_data_filename,
        when_done: (responseJson) => {
          let deepCopyTelemetryData = JSON.parse(JSON.stringify(this.state.telemetry_data))
          deepCopyTelemetryData['raw_data_url'] = responseJson['url']
          this.setGlobalStateVar('telemetry_data', deepCopyTelemetryData)
          when_done()
        },
        when_failed: when_failed,
      }) 
    }
    if (Object.keys(hash_in).includes('movie_mappings')) {
      let deepCopyTelemetryData = JSON.parse(JSON.stringify(this.state.telemetry_data))
      deepCopyTelemetryData['movie_mappings'] = hash_in['movie_mappings']
      this.setGlobalStateVar('telemetry_data', deepCopyTelemetryData)
      when_done()
    }
  }

  setIllustrateParameters(hash_in) {
    let deepCopyIllustrateParameters= JSON.parse(JSON.stringify(this.state.illustrateParameters))
    if (Object.keys(hash_in).includes('color')) {
      deepCopyIllustrateParameters['color'] = hash_in['color']
    }
    if (Object.keys(hash_in).includes('lineWidth')) {
      deepCopyIllustrateParameters['lineWidth'] = hash_in['lineWidth']
    }
    if (Object.keys(hash_in).includes('backgroundDarkenPercent')) {
      deepCopyIllustrateParameters['backgroundDarkenPercent'] = hash_in['backgroundDarkenPercent']
    }
    this.setGlobalStateVar('illustrateParameters', deepCopyIllustrateParameters)
  }

  setFramesetHash(frameset_hash, framesets='') {
    const the_url = this.getImageFromFrameset(frameset_hash, framesets)
    if (the_url === '') {
      this.setGlobalStateVar('frameset_hash', '')
      return
    }
    if (!frameset_hash) {
      frameset_hash = this.makeNewFrameFrameset(the_url) 
    }
    var img = new Image()
    var app_this = this
    img.onload = function(){
      app_this.setState({
        image_width: this.width,
        image_height: this.height,
        frameset_hash: frameset_hash,
      })
    }
    img.src = the_url
  }

  getCurrentUser() {
    try {
      if (document.getElementById('App-whoami')) {
        var name= document.getElementById('App-whoami').children[0].children[1].innerHTML.split(';')[1]
        if (name) {
          return name 
        }
      }
    }
    catch(err) {
    }
  }

  setCampaignMovies(movies) {
    if (typeof movies === 'string' || movies instanceof String) {
      movies = movies.split('\n')
    }
    this.setGlobalStateVar('campaign_movies', movies)
  }

  addImageToMovie(data_in) {
    if (!Object.keys(data_in).includes('url')) {
      console.log('error in addImageToMovie incoming data, no url found')
      return
    }
    let image_url = data_in['url']
    let deepCopyMovies= JSON.parse(JSON.stringify(this.state.movies))
    let movie_url = 'whatever'
    if (Object.keys(data_in).includes('movie_url')) {
      movie_url = data_in['movie_url']
    }
    let deepCopyMovie = JSON.parse(JSON.stringify(deepCopyMovies[movie_url]))
    let new_hash = (Object.keys(deepCopyMovie['framesets']).length + 1).toString()
    deepCopyMovie['frames'].push(image_url)
    deepCopyMovie['framesets'][new_hash] = {
      images: [image_url]
    }
    deepCopyMovies[movie_url] = deepCopyMovie
    this.setGlobalStateVar('movies', deepCopyMovies)
    this.setFramesetHash(new_hash)
  }

  establishNewEmptyMovie(new_movie_url='whatever', make_active=true) {
    this.setGlobalStateVar('movies', {})
    let new_movie = {
      frames: [],
      framesets: {},
    }
    let deepCopyMovies= JSON.parse(JSON.stringify(this.state.movies))
    deepCopyMovies[new_movie_url] = new_movie
    this.setState({
      movies: deepCopyMovies,
    })
    if (make_active) {
      this.setState({
        movie_url: new_movie_url,
      })
    }
    this.addToCampaignMovies(new_movie_url)
  }

  addToCampaignMovies(movie_url) {
    if (!this.state.campaign_movies.includes(movie_url)) {
      let deepCopyCampaignMovies= JSON.parse(JSON.stringify(this.state.campaign_movies))
      deepCopyCampaignMovies.push(movie_url)
      this.setGlobalStateVar('campaign_movies', deepCopyCampaignMovies)
    }
  }

  establishNewMovie(data_in) {
    if (!Object.keys(data_in).includes('url')) {
      console.log('error in establishNewMovie incoming data, no url found')
      return
    }
    this.handleSetMovieUrl(data_in['url'])
    // A hack, but for whatever reason the state isn't ready when the moviePanel renders
    document.getElementById('image_panel_link').click()
    document.getElementById('movie_panel_link').click()
    this.addToCampaignMovies(data_in['url'])
  }

  async checkIfApiCanSeeUrl(the_url, when_done=(()=>{})) {
    let response = await fetch(this.getUrl('can_see_url'), {
      method: 'POST',
      headers: this.buildJsonHeaders(),
      body: JSON.stringify({
        url: the_url,
      }),
    })
    .then((response) => response.json())
    .then((responseJson) => {
      when_done(responseJson)
    })
    .catch((error) => {
      console.error(error)
    })
    await response
  }

  async checkIfGuiCanSeeUrl(the_url, when_done=(()=>{})) {
    let response = await fetch(the_url, {
      method: 'HEAD',
    })
    .then((response) => {
      if (response.status === 200) {
        when_done({can_reach: true})
      } else {
        when_done({can_reach: false})
      }
    })
    .catch((error) => {
      when_done({can_reach: false})
    })
    await response
  }

  getImageBlob(url) {
    return new Promise( async resolve=>{
      let response = await fetch(url)
      let blob = response.blob()
      resolve(blob)
    })
  }

  blobToBase64(blob) {
    return new Promise( resolve=>{
      let reader = new FileReader()
      reader.onload = function() {
        let dataUrl = reader.result
        resolve(dataUrl);
      };
      reader.readAsDataURL(blob)
    })
  }

  async getBase64Image(url) {
    let blob = await this.getImageBlob(url)
    let base64 = await this.blobToBase64(blob)
    return base64
  }

  async getScanners() {
    let the_url = this.getUrl('scanners_url')
    await fetch(the_url, {
      method: 'GET',
      headers: this.buildJsonHeaders(),
    })
    .then((response) => response.json())
    .then((responseJson) => {
      this.setGlobalStateVar('scanners', responseJson['scanners'])
    })
    .catch((error) => {
      console.error(error);
    })
  }

  async importScanner(the_uuid, when_done=(()=>{})) {
    let the_url = this.getUrl('scanners_url') + '/' + the_uuid
    await fetch(the_url, {
      method: 'GET',
      headers: this.buildJsonHeaders(),
    })
    .then((response) => response.json())
    .then((responseJson) => {
      const scanner = JSON.parse(responseJson['scanner']['content'])
      const scanner_type = responseJson['scanner']['type']
      let deepCopyT1Scanners = JSON.parse(JSON.stringify(this.state.tier_1_scanners))
      let deepCopyThisScanners = deepCopyT1Scanners[scanner_type]
      scanner['attributes'] = responseJson['scanner']['attributes']
      deepCopyThisScanners[scanner['id']] = scanner
      deepCopyT1Scanners[scanner_type] = deepCopyThisScanners
      this.setGlobalStateVar('tier_1_scanners', deepCopyT1Scanners)
      return responseJson
    })
    .then((responseJson) => {
      when_done(responseJson)
    })
    .catch((error) => {
      console.error(error);
    })
  }

  async deleteScanner(the_uuid, when_done=(()=>{})) {
    let the_url = this.getUrl('scanners_url') + '/' + the_uuid
    await fetch(the_url, {
      method: 'DELETE',
      headers: this.buildJsonHeaders(),
    })
    .then(() => {
      setTimeout(this.getScanners, 500)
      when_done()
    })
    .catch((error) => {
      console.error(error);
    })
  }

  async saveScannerToDatabase(scanner_type, scanner_obj, when_done=(()=>{})) {
    let description_string = ''
    if (Object.keys(scanner_obj).includes('description')) {
      description_string = scanner_obj['description']
    }
    let response = await fetch(this.getUrl('scanners_url'), {
      method: 'POST',
      headers: this.buildJsonHeaders(),
      body: JSON.stringify({
        type: scanner_type,
        name: scanner_obj['name'],
        description: description_string,
        content: scanner_obj,
      }),
    })
    .then((response) => response.json())
    .then((responseJson) => {
      when_done(responseJson)
    })
    .catch((error) => {
      console.error(error)
    })
    await response
  }

  async postMakeUrlCall(hash_in) {
    let image_data = hash_in.hasOwnProperty('data_uri')? hash_in['data_uri'] : ''
    let image_name = hash_in.hasOwnProperty('filename')? hash_in['filename'] : 'no filename'
    let when_done = hash_in.hasOwnProperty('when_done')? hash_in['when_done'] : (()=>{})
    let when_failed = hash_in.hasOwnProperty('when_failed')? hash_in['when_failed'] : (()=>{})
    let response = await fetch(this.getUrl('make_url_url'), {
      method: 'POST',
      headers: this.buildJsonHeaders(),
      body: JSON.stringify({
        data_uri: image_data,
        filename: image_name,
      }),
    })
    .then((response) => response.json())
    .then((responseJson) => {
      when_done(responseJson)
    })
    .catch((error) => {
      console.error(error)
      when_failed(error)
    })
    await response
  }

  playTone() {
    if (!this.state.session_audio['playSound']) {
      return
    }
    let context = new AudioContext()
    var now = context.currentTime;
    var ct = new CompositeTone()
    if (this.state.session_audio['userTone'] === 'kick_snare') {
      var kick = ct.makeKick(context);
      var snare = ct.makeSnare(context);
      for (let i=0; i < 16; i++) {
        let offset = now + i * .5
        kick.trigger(offset);
        kick.trigger(offset + 0.13);
        snare.trigger(offset + 0.25);
      }
    } else if (this.state.session_audio['userTone'] === 'lfo') {
      var lfo = ct.makeLFO(context)
      lfo.trigger(now + .75)
    } else if (this.state.session_audio['userTone'] === 'blip') {
      var blip = ct.makeBlip(context)
      blip.trigger(now + .75)
    }
  }

  unwatchJob(job_id) {
    let deepCopyCallbacks = JSON.parse(JSON.stringify(this.state.whenJobLoaded))
    delete deepCopyCallbacks[job_id]
    this.setGlobalStateVar('whenJobLoaded', deepCopyCallbacks)
  }

  watchForJob(job_id, callback=(()=>{}), deleteJob=false) {
    let deepCopyCallbacks = JSON.parse(JSON.stringify(this.state.whenJobLoaded))
    deepCopyCallbacks[job_id] = {}
    deepCopyCallbacks[job_id]['callback'] = callback
    if (this.state.preserveAllJobs) {
      deepCopyCallbacks[job_id]['delete'] = false
    } else {
      deepCopyCallbacks[job_id]['delete'] = deleteJob
    }
    this.setGlobalStateVar('whenJobLoaded', deepCopyCallbacks)
  }

  isAttachedJob(job) {
    if (this.state.attached_job['id'] && this.state.attached_job['id'] === job['id']) {
      return true
    }
  }

  getAttachedJobMessage(job) {
    if (this.state.attached_job['status'] === 'running' && job['status'] === 'success') {
      return 'job has completed'
    }
    if (this.state.attached_job['status'] === 'running') {
      if (this.state.attached_job['percent_done'] !== job['elapsed_time']) {
        let et_number = job['elapsed_time'].toString().substring(1, 4) * 100
        et_number = Math.floor(et_number)
        return et_number.toString() + ' percent complete'
      }
    } 
  }

  handleAttachedJobUpdate(job) {
    let deepCopyAJ = JSON.parse(JSON.stringify(this.state.attached_job))
    let aj_message_text = this.getAttachedJobMessage(job)
    deepCopyAJ['status'] = job['status']
    deepCopyAJ['percent_done'] = job['elapsed_time']
    let msg = new SpeechSynthesisUtterance(aj_message_text)
    this.setState({
      attached_job: deepCopyAJ,
      message: aj_message_text,
    })
    if (!this.state.session_audio['playSound']) {
      return
    }
    if (this.state.session_audio['voice']['index']) {
      const int_index = parseInt(this.state.session_audio['voice']['index'])
      if (window.speechSynthesis.getVoices()) {
        msg.voice = window.speechSynthesis.getVoices()[int_index]
      }
    }
    if (this.state.session_audio['voice']['pitch']) {
      msg.pitch = this.state.session_audio['voice']['pitch']
    }
    if (this.state.session_audio['voice']['rate']) {
      msg.pitch = this.state.session_audio['voice']['rate']
    }
    window.speechSynthesis.speak(msg);
  }

  checkForJobs() {
    const jobIdsToCheckFor = Object.keys(this.state.whenJobLoaded)
    if (jobIdsToCheckFor.length) {
      this.getJobs()
      for (let index in this.state.jobs) {
        const job = this.state.jobs[index]
        if (this.isAttachedJob(job)) {
          this.handleAttachedJobUpdate(job)
        }
        if (jobIdsToCheckFor.includes(job['id'])) {
          if (job['status'] === 'success') {
            const callback = this.state.whenJobLoaded[job['id']]['callback']
            this.loadJobResults(job['id'], callback)
            if (callback) {
              callback()
            }
          }
        }
      }
    }
    setTimeout(this.checkForJobs, 2000);
  }

  updateGlobalState(the_data) {
    try {
      const json_data = JSON.parse(the_data)
      for (let index in Object.keys(json_data)) {
        const key = Object.keys(json_data)[index]
        if (Object.keys(this.state).includes(key)) {
          let new_state = {}
          new_state[key] = json_data[key]
          this.setState(new_state)
          console.log('updated global state for '+key)
        } else {
          console.log('no key found in global state for '+key)
        }
      }
    } catch (e) {
      console.log('updateGlobalState crashed, probably bad json')
    }
  }

  async gotoWhenDoneTarget(when_done=(()=>{})) {
    const the_url = this.getUrl('link_url')
    let image_urls = []
    if (!Object.keys(this.state.movies).includes('sequence')) {
      // TODO use the page messaging line for this eventually
      //   for now we do this from two pages, so this needs to be figured out
      alert('No sequence movie found, cannot submit')
      return
    }
    const sequence_movie = this.state.movies['sequence']
    const framesets = sequence_movie['framesets']
    for (let i=0; i < Object.keys(framesets).length; i++) {
      const frameset_hash = Object.keys(framesets)[i]
      const frameset = framesets[frameset_hash]
      if (Object.keys(frameset).includes('redacted_image')) {
        image_urls.push(frameset['redacted_image'])
      } else {
        image_urls.push(frameset['images'][0])
      }
    }

    let response = await fetch(the_url, {
      method: 'POST',
      headers: this.buildJsonHeaders(),
      body: JSON.stringify({
        image_urls: image_urls,
      }),
    })
    .then((response) => response.json())
    .then((responseJson) => {
      when_done(responseJson)
      if (Object.keys(responseJson).includes('learn_edit_url')) {
        window.location.replace(responseJson['learn_edit_url'])
      } else {
      // TODO use the page messaging line for this eventually
      //   for now we do this from two pages, so this needs to be figured out
        alert('no url in learn response, there must be a problem')
      }
    })
    .catch((error) => {
      console.error(error);
    })
    await response
  }

  saveWhenDoneInfo(destination) {
    this.setGlobalStateVar('whenDoneTarget', destination)
  }

  getFramesetHashesInOrder(framesets=null) {
    if (framesets === null) {
      if (this.state.movies && this.state.movie_url && Object.keys(this.state.movies).includes(this.state.movie_url)) {
        if (Object.keys(this.state.movies[this.state.movie_url]).includes('frameset_hashes_in_order')) {
          return this.state.movies[this.state.movie_url]['frameset_hashes_in_order']
        }
      }
      framesets = this.getCurrentFramesets()
    }
    let frames = []
    for (let i=0; i < Object.keys(framesets).length; i++) {
      let frameset = framesets[Object.keys(framesets)[i]]
      for (let j=0; j < frameset['images'].length; j++) {
        frames.push(frameset['images'][j])
      }
    }
    frames.sort()
    let return_arr = []
    for (let i=0; i < frames.length; i++) {
      const frameset_hash = this.getFramesetHashForImageUrl(frames[i], framesets)
      if (!return_arr.includes(frameset_hash)) {
        return_arr.push(frameset_hash)
      }
    }
    return return_arr
  }

  updateSingleImageMovie(the_image_url) {
    let deepCopyMovies= JSON.parse(JSON.stringify(this.state.movies))
    deepCopyMovies['whatever']['frames'] = [the_image_url]
    deepCopyMovies['whatever']['framesets'][1]['images'] = [the_image_url]
    this.setGlobalStateVar('movies', deepCopyMovies)
  }

  clearCurrentFramesetChanges(when_done=(()=>{})) {
    const the_hash = this.getFramesetHashForImageUrl(this.getImageUrl())
    let deepCopyMovies= JSON.parse(JSON.stringify(this.state.movies))
    if (Object.keys(deepCopyMovies).includes(this.state.movie_url)) {
      if (Object.keys(deepCopyMovies[this.state.movie_url]['framesets']).includes(the_hash)) {
        delete deepCopyMovies[this.state.movie_url]['framesets'][the_hash]['areas_to_redact']
        delete deepCopyMovies[this.state.movie_url]['framesets'][the_hash]['redacted_image']
        delete deepCopyMovies[this.state.movie_url]['framesets'][the_hash]['illustrated_image']
        deepCopyMovies[this.state.movie_url]['framesets'][the_hash]['areas_to_redact'] = []
        this.setGlobalStateVar('movies', deepCopyMovies)
      }
    }
  }

  getRedactedMovieUrl() {
    if (this.state.movie_url) {
      if (Object.keys(this.state.movies).includes(this.state.movie_url)) {
        let this_movie = this.state.movies[this.state.movie_url]
        if (Object.keys(this_movie).includes('redacted_movie_url')) {
          return this_movie['redacted_movie_url']
        }
      }
    }
  }

  setMovieRedactedUrl(the_url) {
    let deepCopyMovies = JSON.parse(JSON.stringify(this.state.movies))
    let existing_movie = deepCopyMovies[this.state.movie_url]
    if (existing_movie) {
      existing_movie['redacted_movie_url'] = the_url
      deepCopyMovies[this.state.movie_url] = existing_movie
      this.setGlobalStateVar('movies', deepCopyMovies)
    }
  }

  getCurrentFramesets() {
    if (this.state.movie_url) {
      if (Object.keys(this.state.movies).includes(this.state.movie_url)) {
        return this.state.movies[this.state.movie_url]['framesets']
      }
    }
    return []
  }

  getCurrentFrames() {
    if (this.state.movie_url) {
      if (Object.keys(this.state.movies).includes(this.state.movie_url)) {
        return this.state.movies[this.state.movie_url]['frames']
      }
    }
    return []
  }

  setMovieNickname = (movie_url, movie_nickname) => {
    let deepCopyMovies = JSON.parse(JSON.stringify(this.state.movies))
    let existing_movie = deepCopyMovies[movie_url]
    if (existing_movie) {
      existing_movie['nickname'] = movie_nickname
      deepCopyMovies[movie_url] = existing_movie
      this.setGlobalStateVar('movies', deepCopyMovies)
    }
  }

  async getImagesForUuid(the_uuid, the_offsets, when_done) {
    const the_url = this.getUrl('get_images_for_uuid_url') + '?uuid=' + the_uuid
    let response = await fetch(the_url, {
      method: 'GET',
      headers: this.buildJsonHeaders(),
    })
    .then((response) => response.json())
    .then((responseJson) => {
      when_done(responseJson['images'], the_offsets)
    })
    .catch((error) => {
      console.error(error);
    })
    await response
  }

  async cropImage(image_url, start, end, anchor_id, when_done=(()=>{})) {
    const the_url = this.getUrl('crop_url')
    let response = await fetch(the_url, {
      method: 'POST',
      headers: this.buildJsonHeaders(),
      body: JSON.stringify({
        image_url: image_url,
        anchor_id: anchor_id,
        start: start,
        end: end,
      }),
    })
    .then((response) => response.json())
    .then((responseJson) => {
      when_done(responseJson)
    })
    .catch((error) => {
      console.error(error);
    })
    await response
  }

  handleSetImageUuid(the_uuid, the_offsets) {
    this.getImagesForUuid(the_uuid, the_offsets, this.afterUuidImagesFetched)
  }

  afterUuidImagesFetched(image_urls, the_offsets) {
    let offset_arr = the_offsets.split(',')
    let image_url_arr = []
    for (let i=0; i < offset_arr.length; i++) {
      image_url_arr.push(image_urls[parseInt(offset_arr[i])])
    }

    let the_framesets = {}
    for (let i=0; i < image_url_arr.length; i++) {
      the_framesets[i] = {images: [image_url_arr[i]]}
    }

    let movie_obj = {
      frames: image_url_arr,
      framesets: the_framesets,
    }
    let movies_obj = {
      'new_movie_url': movie_obj,
    }

    this.setState({
      movies: movies_obj,
      movie_url: 'new_movie_url',
    })
    let first_hash = Object.keys(the_framesets)[0]
    this.setFramesetHash(first_hash)
  }

  setSelectedAreaMetas = (the_metas, meta_id_to_make_active='') => {
    let deepCopyScanners = JSON.parse(JSON.stringify(this.state.tier_1_scanners))
    deepCopyScanners['selected_area'] = the_metas
    let deepCopyIds = JSON.parse(JSON.stringify(this.state.tier_1_scanner_current_ids))
    deepCopyIds['selected_area'] = meta_id_to_make_active
    if (meta_id_to_make_active) {
      this.setState({
        tier_1_scanners: deepCopyScanners,
        tier_1_scanner_current_ids: deepCopyIds,
      })
    } else {
      this.setGlobalStateVar('tier_1_scanners', deepCopyScanners)
    }
  }

  setImageScale= () => {
    const the_scale = (document.getElementById('base_image_id').width / 
      document.getElementById('base_image_id').naturalWidth)
    this.setGlobalStateVar('image_scale', the_scale)
  }

  setWorkbooks = (the_workbooks) => {
    if (!the_workbooks.length) {
      this.setState({
        workbooks: the_workbooks,
        current_workbook_id: '',
        current_workbook_name: 'workbook 1',
      })
    } else {
      this.setGlobalStateVar('workbooks', the_workbooks)
    }
  }

  componentDidMount() {
    this.getAndSaveUser()
    this.processUserClasses()
    if (!this.state.showMovieParserLink) {
      document.getElementById('movie_panel_link').style.display = 'none'
    }
    if (!this.state.showInsightsLink) {
      document.getElementById('insights_link').style.display = 'none'
    }
    if (!this.state.showComposeLink) {
      document.getElementById('compose_link').style.display = 'none'
    }
    this.checkForJobs()
    this.checkForInboundGetParameters()
  }

  setActiveMovie(the_url, theCallback=(()=>{})) {
    const the_movie = this.state.movies[the_url]
    if (this.state.movie_url !== the_url) {
      this.setGlobalStateVar('movie_url', the_url)
    }
    theCallback(the_movie.framesets)
  }

  buildJsonHeaders() {
    let headers = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    }
    if (this.state.api_key) {
      headers['Authorization'] = 'Api-Key ' + this.state.api_key
    }
    return headers
  }

  storeRedactedImage(responseJson) {
    let local_framesets = JSON.parse(JSON.stringify(this.getCurrentFramesets()));
    const frameset_hash = this.getFramesetHashForImageUrl(responseJson['original_image_url'])
    let frameset = local_framesets[frameset_hash]
    frameset['redacted_image'] = responseJson['redacted_image_url']
    local_framesets[frameset_hash] = frameset
    this.handleUpdateFrameset(frameset_hash, frameset)
  }

  addMovieAndSetActive(movie_url, movies, theCallback=(()=>{})) {
    this.addToCampaignMovies(movie_url)
    let deepCopyMovies = movies
    if (movies[movie_url]['frames'].length > 0) {
      deepCopyMovies = JSON.parse(JSON.stringify(movies))
      const hashes = this.getFramesetHashesInOrder()
      this.setFramesetHash(hashes[0])
      deepCopyMovies[movie_url]['frameset_hashes_in_order'] = hashes
    } 
    this.setState({
      movie_url: movie_url, 
      movies: movies,
    },
    theCallback(movies[movie_url]['framesets'])
    )
  }

  getMovieNicknameFromUrl(the_url) {
    let url_parts = the_url.split('/')
    let name_parts = url_parts[url_parts.length-1].split('.')
    let file_name_before_dot = name_parts[name_parts.length-2]
    return file_name_before_dot
  }

  async doPing(when_done_success, when_done_failure) {
    await fetch(this.getUrl('ping_url'), {
      method: 'GET',
      headers: this.buildJsonHeaders(),
    })
    .then((response) => response.json())
    .then((responseJson) => {
      if (Object.keys(responseJson).includes('response') && responseJson['response'] === 'pong') {
        when_done_success(responseJson)
      } else {
        when_done_failure()
      }
    })
    .catch((error) => {
      when_done_failure()
    })
  }

  async doGetVersion(when_done_success, when_done_failure) {
    await fetch(this.getUrl('version_url'), {
      method: 'GET',
      headers: this.buildJsonHeaders(),
    })
    .then((response) => response.json())
    .then((responseJson) => {
      if (Object.keys(responseJson).includes('version')) {
        when_done_success(responseJson)
      } else {
        when_done_failure()
      }
    })
    .catch((error) => {
      when_done_failure()
    })
  }

  getMaskZonesForAnchor(template, anchor_id) {
    let mask_zones = []
    for (let i=0; i < template['mask_zones'].length; i++) {
      const mask_zone = template['mask_zones'][i]
      if (Object.keys(mask_zone).includes('anchor_id')) {
        if (mask_zone['anchor_id'] === anchor_id) {
          mask_zones.push(mask_zone)
        }
      } else {
        mask_zones.push(mask_zone)
      }
    }
    return mask_zones
  }

  getAreaToRedactFromTemplateMatch(mask_zone, anchor_id, template, anchor_found_coords, anchor_found_scale) {
    let anchor = ''
    for (let i=0; i < template['anchors'].length; i++) {
      if (template['anchors'][i]['id'] === anchor_id) {
        anchor = template['anchors'][i]
      }
    }
    const anchor_spec_coords = anchor['start']

    const mz_size = [
        (mask_zone['end'][0] - mask_zone['start'][0]) / anchor_found_scale,
        (mask_zone['end'][1] - mask_zone['start'][1]) / anchor_found_scale,
    ]
    let mz_spec_offset = [
        mask_zone['start'][0] - anchor_spec_coords[0],
        mask_zone['start'][1] - anchor_spec_coords[1],
    ]
    let mz_spec_offset_scaled = [
        mz_spec_offset[0] / anchor_found_scale,
        mz_spec_offset[1] / anchor_found_scale
    ]

    const new_start = [
        anchor_found_coords[0] + mz_spec_offset_scaled[0],
        anchor_found_coords[1] + mz_spec_offset_scaled[1],
    ]

    const new_end = [
        new_start[0] + mz_size[0],
        new_start[1] + mz_size[1]
    ]
    const new_area_to_redact = {
      'start': new_start,
      'end': new_end,
      'source': 'template: '+template['id'],
    }
    return new_area_to_redact
  }

  getTemplateForAnchor(templates, anchor_id) {
    for (let i=0; i < Object.keys(templates).length; i++) {
      const template_id = Object.keys(templates)[i]
      const template = templates[template_id]
      for (let j=0; j < template['anchors'].length; j++) {
        if (template['anchors'][j].id === anchor_id) {
          return templates[template_id]
        }
      }
    }
  }

  loadTier1ScannersFromTier1Request(scanner_type, request_data, force_add=false) {
    let scanner_id = ''
    let something_changed = false
    let deepCopyScanners = JSON.parse(JSON.stringify(this.state.tier_1_scanners))
    let deepCopyThisScanners = deepCopyScanners[scanner_type]
    for (let i=0; i < Object.keys(request_data['tier_1_scanners'][scanner_type]).length; i++) {
      scanner_id = Object.keys(request_data['tier_1_scanners'][scanner_type])[i]
      if (force_add || !Object.keys(deepCopyThisScanners).includes(scanner_id)) {
        deepCopyThisScanners[scanner_id] = request_data['tier_1_scanners'][scanner_type][scanner_id]
        something_changed = true
      }
    }
    if (something_changed) {
      deepCopyScanners[scanner_type] = deepCopyThisScanners
      let deepCopyScannerIds = JSON.parse(JSON.stringify(this.state.tier_1_scanner_current_ids))
      deepCopyScannerIds[scanner_type] = scanner_id
      this.setState({
        tier_1_scanners: deepCopyScanners,
        tier_1_scanner_current_ids: deepCopyScannerIds,
      })
    }
  }

  loadMoviesFromTier1Request(request_data) {
    let movie_url = ''
    let deepCopyMovies= JSON.parse(JSON.stringify(this.state.movies))
    let something_changed = false
    for (let i=0; i < Object.keys(request_data['movies']).length; i++) {
      if (Object.keys(request_data['movies'])[i] === 'source') {
        continue
      }
      movie_url = Object.keys(request_data['movies'])[i]
      if (!Object.keys(deepCopyMovies).includes(movie_url)) {
        if ((Object.keys(request_data['movies']).includes('source')) &&
            (Object.keys(request_data['movies']['source']).includes(movie_url))) {
            deepCopyMovies[movie_url] = request_data['movies']['source'][movie_url]
        } else {
            deepCopyMovies[movie_url] = request_data['movies'][movie_url]
        }
        this.addToCampaignMovies(movie_url)
        something_changed = true
      }
    }
    if (something_changed && request_data['scan_level'] === 'tier_1') {
      this.setState({
        movies: deepCopyMovies,
        movie_url: movie_url,
      })
    }
    return {
      movie_url: movie_url,
      deepCopyMovies: deepCopyMovies
    }
  }

  async loadOcrSceneAnalysisResults(job, when_done=(()=>{})) {
    const response_data = JSON.parse(job.response_data)
    if (!response_data) {
      return
    }
    if (!Object.keys(response_data).includes('movies')) {
      return
    }
    const request_data = JSON.parse(job.request_data)
    this.loadTier1ScannersFromTier1Request('ocr_scene_analysis', request_data)
    this.loadMoviesFromTier1Request(request_data)
    let deepCopyTier1Matches = JSON.parse(JSON.stringify(this.state.tier_1_matches))
    let deepCopyOsaMatches = deepCopyTier1Matches['ocr_scene_analysis']
    if (!deepCopyOsaMatches) {
      deepCopyOsaMatches = {}
    }
    deepCopyOsaMatches[request_data['id']] = response_data
    deepCopyTier1Matches['ocr_scene_analysis'] = deepCopyOsaMatches
    this.setGlobalStateVar('tier_1_matches', deepCopyTier1Matches)
  }

  async loadOmaScanResults(job, when_done=(()=>{})) {
    const response_data = JSON.parse(job.response_data)
    if (!response_data) {
      return
    }
    if (!Object.keys(response_data).includes('movies')) {
      return
    }
    let something_changed = false
    let movie_url = ''
    let deepCopyMovies= JSON.parse(JSON.stringify(this.state.movies))
    for (let i=0; i < Object.keys(response_data['movies']).length; i++) {
      movie_url = Object.keys(response_data['movies'])[i]
      deepCopyMovies[movie_url] = response_data['movies'][movie_url]
      something_changed = true
    }
    if (something_changed) {
      this.addMovieAndSetActive(
        movie_url,
        deepCopyMovies,
        when_done,
      )
    }
  }

  async loadOcrResults(job, when_done=(()=>{})) {
    const response_data = JSON.parse(job.response_data)
    if (!response_data) {
      return
    }
    if (!Object.keys(response_data).includes('movies')) {
      return
    }
    const request_data = JSON.parse(job.request_data)
    this.loadTier1ScannersFromTier1Request('ocr', request_data)
    let resp_obj = this.loadMoviesFromTier1Request(request_data)
    let movie_url = resp_obj['movie_url']
    let deepCopyMovies = resp_obj['deepCopyMovies']
    if (request_data['scan_level'] === 'tier_1') {
      let deepCopyTier1Matches = JSON.parse(JSON.stringify(this.state.tier_1_matches))
      let deepCopyOcrMatches = deepCopyTier1Matches['ocr']
      deepCopyOcrMatches[request_data['id']] = response_data
      deepCopyTier1Matches['ocr'] = deepCopyOcrMatches // todo: can we remove this?
      this.setGlobalStateVar('tier_1_matches', deepCopyTier1Matches)
      return
    }

    let something_changed = false
    for (let i=0; i < Object.keys(response_data['movies']).length; i++) {
      const movie_url = Object.keys(response_data['movies'])[i]
      if (!Object.keys(deepCopyMovies).includes(movie_url)) {
        deepCopyMovies[movie_url] = request_data['movies'][movie_url]
      }
      for (let j=0; j < Object.keys(response_data['movies'][movie_url]['framesets']).length; j++) {
        const frameset_hash = Object.keys(response_data['movies'][movie_url]['framesets'])[j]
        const frameset = response_data['movies'][movie_url]['framesets'][frameset_hash]
        for (let k=0; k < Object.keys(frameset).length; k++) {
          const area_key = Object.keys(frameset)[k]
          const new_area_to_redact = frameset[area_key]
          if (!Object.keys(deepCopyMovies[movie_url]['framesets'][frameset_hash]).includes('areas_to_redact')) {
            deepCopyMovies[movie_url]['framesets'][frameset_hash]['areas_to_redact'] = []
          }
          deepCopyMovies[movie_url]['framesets'][frameset_hash]['areas_to_redact'].push(new_area_to_redact)
          something_changed = true
        }
      }
    }
    if (something_changed) {
      this.setState({
        movies: deepCopyMovies,
        movie_url: movie_url,
      })
    }
  }

  async loadHogTestResults(job, when_done=(()=>{})) {
    const response_data = JSON.parse(job.response_data)
    if (!response_data) {
      return
    }
    if (!Object.keys(response_data).includes('movies')) {
      return
    }
    const request_data = JSON.parse(job.request_data)
    this.loadTier1ScannersFromTier1Request('hog', request_data)
    let resp_obj = this.loadMoviesFromTier1Request(request_data)
    let movie_url = resp_obj['movie_url']
    let deepCopyMovies = resp_obj['deepCopyMovies']
    this.setState({
      movies: deepCopyMovies,
      movie_url: movie_url,
    })
    if (request_data['scan_level'] === 'tier_1') {
      let deepCopyTier1Matches = JSON.parse(JSON.stringify(this.state.tier_1_matches))
      let deepCopyHogMatches = deepCopyTier1Matches['hog']
      deepCopyHogMatches[request_data['id']] = response_data
      deepCopyTier1Matches['hog'] = deepCopyHogMatches
      this.setGlobalStateVar('tier_1_matches', deepCopyTier1Matches)
    }
  }

  async loadHogTrainResults(job, when_done=(()=>{})) {
    const response_data = JSON.parse(job.response_data)
    if (!response_data) {
      return
    }
    if (!Object.keys(response_data).includes('movies')) {
      return
    }
    const request_data = JSON.parse(job.request_data)
    this.loadTier1ScannersFromTier1Request('hog', response_data, true)
    let resp_obj = this.loadMoviesFromTier1Request(request_data)
    let movie_url = resp_obj['movie_url']
    let deepCopyMovies = resp_obj['deepCopyMovies']
    this.setState({
      movies: deepCopyMovies,
      movie_url: movie_url,
    })
    if (request_data['scan_level'] === 'tier_1') {
      let deepCopyTier1Matches = JSON.parse(JSON.stringify(this.state.tier_1_matches))
      let deepCopyHogTrainingMatches = deepCopyTier1Matches['hog_training']
      deepCopyHogTrainingMatches[request_data['id']] = response_data
      deepCopyTier1Matches['hog_training'] = deepCopyHogTrainingMatches
      this.setGlobalStateVar('tier_1_matches', deepCopyTier1Matches)
    }
  }

  loadTemplateResults(job, when_done=(()=>{})) {
    const response_data = JSON.parse(job.response_data)
    if (!response_data) {
      return
    }
    if (!Object.keys(response_data).includes('movies')) {
      return
    }
    const request_data = JSON.parse(job.request_data)
    this.loadTier1ScannersFromTier1Request('template', request_data)
    let resp_obj = this.loadMoviesFromTier1Request(request_data)
    let movie_url = resp_obj['movie_url']
    let deepCopyMovies = resp_obj['deepCopyMovies']
    if (request_data['scan_level'] === 'tier_1') {
      let deepCopyTier1Matches = JSON.parse(JSON.stringify(this.state.tier_1_matches))
      let deepCopyTemplateMatches = deepCopyTier1Matches['template']
      deepCopyTemplateMatches[request_data['id']] = response_data
      deepCopyTier1Matches['template'] = deepCopyTemplateMatches // todo: can we remove this?
      this.setGlobalStateVar('tier_1_matches', deepCopyTier1Matches)
      return
    }

    let something_changed = false
    for (let i=0; i < Object.keys(response_data['movies']).length; i++) {
      movie_url = Object.keys(response_data['movies'])[i]
      for (let j = 0; j < Object.keys(response_data['movies'][movie_url]['framesets']).length; j++) {
        const frameset_hash = Object.keys(response_data['movies'][movie_url]['framesets'])[j]
        const frameset = response_data['movies'][movie_url]['framesets'][frameset_hash]
        for (let k = 0; k < Object.keys(frameset).length; k++) {
          const anchor_id = Object.keys(frameset)[k]
          const anchor_found_coords = frameset[anchor_id]['location']
          const anchor_found_scale = frameset[anchor_id]['scale']
          const template = this.getTemplateForAnchor(request_data['tier_1_scanners']['template'], anchor_id) 
          const mask_zones = this.getMaskZonesForAnchor(template, anchor_id)
          for (let m=0; m < mask_zones.length; m++) {
            const mask_zone = mask_zones[m]
            const area_to_redact = this.getAreaToRedactFromTemplateMatch(
                mask_zone, anchor_id, template, anchor_found_coords, anchor_found_scale
            ) 
            let deepCopyFrameset = deepCopyMovies[movie_url]['framesets'][frameset_hash]
            if (!Object.keys(deepCopyFrameset).includes('areas_to_redact')) {
              deepCopyFrameset['areas_to_redact'] = []
            }
            deepCopyFrameset['areas_to_redact'].push(area_to_redact)
            something_changed = true
          }
        }
      }
    }

    if (something_changed) {
      this.setState({
        movies: deepCopyMovies,
        movie_url: movie_url,
      })
    }
  }

  loadSelectedAreaResults(job, when_done) {
    const response_data = JSON.parse(job.response_data)
    if (!response_data) {
      return
    }
    if (!Object.keys(response_data).includes('movies')) {
      return
    }
    const request_data = JSON.parse(job.request_data)
    this.loadTier1ScannersFromTier1Request('selected_area', request_data)
    let resp_obj = this.loadMoviesFromTier1Request(request_data)
    const movie_url = resp_obj['movie_url']
    let deepCopyMovies = resp_obj['deepCopyMovies']

    if (request_data['scan_level'] === 'tier_1') {
      let deepCopyTier1Matches = JSON.parse(JSON.stringify(this.state.tier_1_matches))
      let deepCopySelectedAreaMatches = deepCopyTier1Matches['selected_area']
      deepCopySelectedAreaMatches[request_data['id']] = response_data
      deepCopyTier1Matches['selected_area'] = deepCopySelectedAreaMatches // todo: can we remove this?
      this.setGlobalStateVar('tier_1_matches', deepCopyTier1Matches)
      return
    }

    let something_changed = false
    for (let i=0; i < Object.keys(response_data['movies']).length; i++) {
      const movie_url = Object.keys(response_data['movies'])[i]
      for (let j = 0; j < Object.keys(response_data['movies'][movie_url]['framesets']).length; j++) {
        const frameset_hash = Object.keys(response_data['movies'][movie_url]['framesets'])[j]
        const selected_areas = response_data['movies'][movie_url]['framesets'][frameset_hash]
        for (let k=0; k < Object.keys(selected_areas).length; k++) {
          const key = Object.keys(selected_areas)[k]
          const selected_area = selected_areas[key]
          const end_point = [
            selected_area['location'][0]+selected_area['size'][0],
            selected_area['location'][1]+selected_area['size'][1]
          ]
          const build_a2r = {
            start: selected_area['location'],
            end: end_point,
            source: 'selected area: ' + request_data['id'],
          }
          if (!Object.keys(deepCopyMovies[movie_url]['framesets'][frameset_hash]).includes('areas_to_redact')) {
            deepCopyMovies[movie_url]['framesets'][frameset_hash]['areas_to_redact'] = []
          }
          deepCopyMovies[movie_url]['framesets'][frameset_hash]['areas_to_redact'].push(build_a2r)
          something_changed = true
        }
      }
    }

    if (something_changed) {
      this.setState({
        movies: deepCopyMovies,
        movie_url: movie_url,
      })
    }
  }

  loadMoviesFromJobResults(job, when_done=(()=>{})) {
    const response_data = JSON.parse(job.response_data)
    let deepCopyMovies = JSON.parse(JSON.stringify(this.state.movies))
    let movie_url = ''
    for (let i=0; i < Object.keys(response_data['movies']).length; i++) {
      movie_url = Object.keys(response_data['movies'])[i]
      deepCopyMovies[movie_url] = response_data['movies'][movie_url]
      deepCopyMovies[movie_url]['nickname'] = this.getMovieNicknameFromUrl(movie_url)
    }
    this.addMovieAndSetActive(
      movie_url,
      deepCopyMovies,
      when_done,
    )
  }

  loadSplitResults(job, when_done=(()=>{})) {
    const response_data = JSON.parse(job.response_data)
    const request_data = JSON.parse(job.request_data)
    let deepCopyMovies = JSON.parse(JSON.stringify(this.state.movies))
    const movie_url = request_data['movie_url']
    deepCopyMovies[movie_url] = response_data['movies'][movie_url]
    deepCopyMovies[movie_url]['nickname'] = this.getMovieNicknameFromUrl(movie_url)
    this.addMovieAndSetActive(
      movie_url,
      deepCopyMovies,
      when_done,
    )
  }

  loadHashResults(job, when_done=(()=>{})) {
    const response_data = JSON.parse(job.response_data)
    const request_data = JSON.parse(job.request_data)
    let deepCopyMovies = JSON.parse(JSON.stringify(this.state.movies))
    const movie_url = Object.keys(request_data['movies'])[0]
    if (!Object.keys(this.state.movies).includes(movie_url)) {
      deepCopyMovies[movie_url] = request_data['movies'][movie_url]
    }
    const framesets = response_data['movies'][movie_url]['framesets']
    deepCopyMovies[movie_url]['framesets'] = framesets
    this.addMovieAndSetActive(
      movie_url,
      deepCopyMovies,
      when_done,
    )
  }

  loadCopyResults(job, when_done=(()=>{})) {
    const response_data = JSON.parse(job.response_data)
    let deepCopyMovies = JSON.parse(JSON.stringify(this.state.movies))
    const movie_url = Object.keys(response_data['movies'])[0]
    if (!Object.keys(this.state.movies).includes(movie_url)) {
      deepCopyMovies[movie_url] = response_data['movies'][movie_url]
    }
    this.addMovieAndSetActive(
      movie_url,
      deepCopyMovies,
      when_done,
    )
  }

  loadChangeResolutionResults(job, when_done=(()=>{})) {
    const response_data = JSON.parse(job.response_data)
    let deepCopyMovies = JSON.parse(JSON.stringify(this.state.movies))
    const movie_url = Object.keys(response_data['movies'])[0]
    deepCopyMovies[movie_url] = response_data['movies'][movie_url]
    this.addMovieAndSetActive(
      movie_url,
      deepCopyMovies,
      when_done,
    )
  }

  loadRenderSubsequenceResults(job, when_done=(()=>{})) {
    const response_data = JSON.parse(job.response_data)
    let deepCopySubsequences = JSON.parse(JSON.stringify(this.state.subsequences))
    const subsequence_id = response_data['subsequence']['id']
    deepCopySubsequences[subsequence_id] = response_data['subsequence']
    this.setGlobalStateVar('subsequences', deepCopySubsequences)
  }

  loadRebaseMoviesResults(job, when_done) {
    const response_data = JSON.parse(job.response_data)
    let deepCopyMovies = JSON.parse(JSON.stringify(this.state.movies))
    let new_campaign_movies = []
    let something_changed = false
    let movie_url = ''
    for (let i=0; i < Object.keys(response_data['movies']).length; i++) {
      movie_url = Object.keys(response_data['movies'])[i]
      const movie_parts = movie_url.split('/')
      const movie_name = movie_parts[movie_parts.length-1]
      const movie = response_data['movies'][movie_url]

      for (let j=0; j < this.state.campaign_movies.length; j++) {
        const campaign_movie_url = this.state.campaign_movies[j]
        const campaign_parts = campaign_movie_url.split('/')
        const campaign_movie_name = campaign_parts[campaign_parts.length-1]
        if (movie_name === campaign_movie_name) {
          something_changed = true
          new_campaign_movies.push(movie_url)
        }
      }

      for (let k=0; k < Object.keys(deepCopyMovies).length; k++) {
        const old_movie_url = Object.keys(deepCopyMovies)[k]
        const old_parts = old_movie_url.split('/')
        const old_movie_name = old_parts[old_parts.length-1]
        if (old_movie_name === movie_name) {
          something_changed = true
          delete deepCopyMovies[old_movie_name]
          deepCopyMovies[movie_url] = movie
        }
      }
    }

    if (something_changed) {
      this.setGlobalStateVar('movies', deepCopyMovies)
      this.setGlobalStateVar('campaign_movies', new_campaign_movies)
      this.addMovieAndSetActive(
        movie_url,
        deepCopyMovies,
        when_done,
      )
    }
  }

  async loadRedactResults(job, when_done=(()=>{})) {
    const response_data = JSON.parse(job.response_data)
    const request_data = JSON.parse(job.request_data)
    let deepCopyMovies = JSON.parse(JSON.stringify(this.state.movies))
    let frameset_hash = ''
    let movie_url = ''
    for (let i=0; i < Object.keys(response_data['movies']).length; i++) {
      movie_url = Object.keys(response_data['movies'])[i]
      if (!Object.keys(deepCopyMovies).includes(movie_url)) {
        deepCopyMovies[movie_url] = request_data['movies'][movie_url]
      }
      this.addToCampaignMovies(movie_url)
      const movie = response_data['movies'][movie_url]
      for (let j=0; j < Object.keys(movie['framesets']).length; j++) {
        const frameset_hash = Object.keys(movie['framesets'])[j]
        const frameset = movie['framesets'][frameset_hash]
        const redacted_image = frameset['redacted_image']
        deepCopyMovies[movie_url]['framesets'][frameset_hash]['redacted_image'] = redacted_image
      }
    }
    this.setState({
      movies: deepCopyMovies,
      movie_url: movie_url,
    })
    this.setFramesetHash(frameset_hash)
  }

  async loadRedactSingleResults(job, when_done=(()=>{})) {
    const resp_data = JSON.parse(job.response_data)
    const req_data = JSON.parse(job.request_data)
    const movie_url = req_data['movie_url']
    const frameset_hash = req_data['frameset_hash']
    let deepCopyMovies = JSON.parse(JSON.stringify(this.state.movies))
    const redacted_image = resp_data['redacted_image_url']
    deepCopyMovies[movie_url]['framesets'][frameset_hash]['redacted_image'] = redacted_image
    this.setState({
      movies: deepCopyMovies,
      movie_url: movie_url,
    })
  }

  async loadIllustrateResults(job, when_done=(()=>{})) {
    let job_url = this.getUrl('jobs_url') + '/' + job.id
    await fetch(job_url, {
      method: 'GET',
      headers: this.buildJsonHeaders(),
    })
    .then((response) => response.json())
    .then((responseJson) => {
      const req_data_string = responseJson['job']['request_data']
      const req_data = JSON.parse(req_data_string)
      const movie_url = req_data['movie_url']
      const frameset_hash = req_data['frameset_hash']
      const resp_data_string = responseJson['job']['response_data']
      const resp_data = JSON.parse(resp_data_string)
      let deepCopyMovies = JSON.parse(JSON.stringify(this.state.movies))
      if (!Object.keys(deepCopyMovies).includes(movie_url)) {
        deepCopyMovies[req_data['movie_url']] = req_data['movie']
      }
      const illus_img_url = resp_data['illustrated_image_url']
      deepCopyMovies[movie_url]['framesets'][frameset_hash]['illustrated_image'] = illus_img_url
      this.setState({
        movies: deepCopyMovies,
        movie_url: movie_url,
      })
      this.addToCampaignMovies(movie_url)
      this.setFramesetHash(frameset_hash)
      return responseJson
    })
    .then((responseJson) => {
      when_done()
    })
    .catch((error) => {
      console.error(error);
    })
  }

  async loadGetTimestampResults(job, when_done=(()=>{})) {
    const resp_data = JSON.parse(job.response_data)
    const req_data = JSON.parse(job.request_data)
    let deepCopyMovies = JSON.parse(JSON.stringify(this.state.movies))
    let last_movie_url = ''
    for (let j=0; j < Object.keys(resp_data).length; j++) {
      const movie_url = Object.keys(resp_data)[j]
      if (!Object.keys(deepCopyMovies).includes(movie_url)) {
        deepCopyMovies[movie_url] = req_data['movies'][movie_url]
      }
      this.addToCampaignMovies(movie_url)
      if (resp_data[movie_url]) {
        deepCopyMovies[movie_url]['start_timestamp'] = resp_data[movie_url]
      }
      last_movie_url = movie_url
    }
    this.setState({
      movies: deepCopyMovies,
      movie_url: last_movie_url,
    })
  }

  loadGetFramesetMatchChartResults(job, when_done=(()=>{})) {
    const resp_data = JSON.parse(job.response_data)
    if (!Object.keys(resp_data).includes('movies')) {
      return
    }
    let deepCopyResults = JSON.parse(JSON.stringify(this.state.results))
    if (!Object.keys(deepCopyResults).includes('movies')) {
      deepCopyResults = {'movies': {}}
    }
    for (let i=0; i < Object.keys(resp_data['movies']).length; i++) {
      const movie_url = Object.keys(resp_data['movies'])[i]
      deepCopyResults['movies'][movie_url] = resp_data['movies'][movie_url]
    }
    this.setState({
      results: deepCopyResults,
    })
  }

  loadGetMovieMatchChartResults(job, when_done=(()=>{})) {
    const resp_data = JSON.parse(job.response_data)
    if (!Object.keys(resp_data).includes('movies')) {
      return
    }
    let deepCopyResults = JSON.parse(JSON.stringify(this.state.results))
    if (!Object.keys(deepCopyResults).includes('movies')) {
      deepCopyResults = {movies: {}}
    }
    for (let i=0; i < Object.keys(resp_data['movies']).length; i++) {
      const movie_url = Object.keys(resp_data['movies'])[i]
      if (!resp_data['movies'][movie_url]) {
        continue
      }
      if (!Object.keys(deepCopyResults['movies']).includes(movie_url)) {
        deepCopyResults['movies'][movie_url] = {'charts': []}
      }
      for (let j=0; j < resp_data['movies'][movie_url].length; j++) {
        const chart_url = resp_data['movies'][movie_url][j]
        deepCopyResults['movies'][movie_url]['charts'].push(chart_url)
      }
    }
    this.setState({
      results: deepCopyResults,
    })
  }

  async loadFilterResults(job, when_done=(()=>{})) {
    const resp_data = JSON.parse(job.response_data)
    const req_data = JSON.parse(job.request_data)
    let deepCopyMovies = JSON.parse(JSON.stringify(this.state.movies))
    let last_movie_url = ''
    let last_hash = ''
    for (let j=0; j < Object.keys(resp_data.movies).length; j++) {
      const movie_url = Object.keys(resp_data.movies)[j]
      if (!Object.keys(deepCopyMovies).includes(movie_url)) {
        deepCopyMovies[movie_url] = req_data['movies'][movie_url]
      }
      this.addToCampaignMovies(movie_url)
      let framesets = resp_data.movies[movie_url]['framesets']
      for (let i=0; i < Object.keys(framesets).length; i++) {
        const frameset_hash = Object.keys(framesets)[i]
        deepCopyMovies[movie_url]['framesets'][frameset_hash]['filtered_image_url'] = framesets[frameset_hash]
      }
      last_movie_url = movie_url
      let hashes = this.getFramesetHashesInOrder(deepCopyMovies[movie_url]['framesets'])
      last_hash = hashes[0]
    }
    this.setState({
      movies: deepCopyMovies,
      movie_url: last_movie_url,
    })
    this.setFramesetHash(last_hash)
  }

  async loadZipMovieResults(job, when_done=(()=>{})) {
    const response_data = JSON.parse(job.response_data)
    const the_url = response_data.movie_url
    this.setMovieRedactedUrl(the_url) 
  }

  loadLoadMovieMetadataResults(job, when_done=(()=>{})) {
    const responseJson = JSON.parse(job.response_data)
    let deepCopyMovies = JSON.parse(JSON.stringify(this.state.movies))
    let deepCopyTemplates = JSON.parse(JSON.stringify(this.state.templates))
    let deepCopyTier1Matches= JSON.parse(JSON.stringify(this.state.tier_1_matches))
    let deepCopyT1Scanners = JSON.parse(JSON.stringify(this.state.tier_1_scanners))
    let deepCopySelectedAreaMetas = deepCopyT1Scanners['selected_area']
    let movie_url = ''
    if (Object.keys(responseJson).includes('movies')) {
      for (let i=0; i < Object.keys(responseJson['movies']).length; i++) {
        movie_url = Object.keys(responseJson['movies'])[i]
        const movie = responseJson['movies'][movie_url]
        deepCopyMovies[movie_url] = movie
        this.addToCampaignMovies(movie_url)
      }
      this.setState({
        movies: deepCopyMovies,
        movie_url: movie_url,
      })
    }
    if (Object.keys(responseJson).includes('templates') && Object.keys(responseJson['templates']).length > 0) {
      let something_changed = false
      for (let i=0; i < Object.keys(responseJson['templates']).length; i++) {
        const template_id = Object.keys(responseJson['templates'])[i]
        if (!Object.keys(this.state.templates).includes(template_id)) {
          deepCopyTemplates[template_id] = responseJson['templates'][template_id]
          something_changed = true
        }
      }
      if (something_changed) {
        this.setGlobalStateVar('templates', deepCopyTemplates)
      }
    }
    if (Object.keys(responseJson).includes('tier_1_matches') && Object.keys(responseJson['tier_1_matches']).length > 0) {
      let something_changed = false
      for (let i=0; i < Object.keys(responseJson['tier_1_matches']['template']).length; i++) {
        const template_id = Object.keys(responseJson['tier_1_matches']['template'])[i]
        if (!Object.keys(this.state.tier_1_matches['template']).includes(template_id)) {
          deepCopyTier1Matches['template'][template_id] = responseJson['tier_1_matches']['template'][template_id]
          something_changed = true
        }
      }
      for (let i=0; i < Object.keys(responseJson['tier_1_matches']['ocr']).length; i++) {
        const ocr_id = Object.keys(responseJson['tier_1_matches']['ocr'])[i]
        if (!Object.keys(this.state.tier_1_matches['ocr']).includes(ocr_id)) {
          deepCopyTier1Matches['ocr'][ocr_id] = responseJson['tier_1_matches']['ocr'][ocr_id]
          something_changed = true
        }
      }
      if (something_changed) {
        this.setGlobalStateVar('tier_1_matches', deepCopyTier1Matches)
      }
    }
    if (Object.keys(responseJson).includes('selected_area_metas') && Object.keys(responseJson['selected_area_metas']).length > 0) {
      let something_changed = false
      for (let i=0; i < Object.keys(responseJson['selected_area_metas']).length; i++) {
        const sam_id = Object.keys(responseJson['selected_area_metas'])[i]
        if (!Object.keys(this.state.tier_1_scanners['selected_area']).includes(sam_id)) {
          deepCopySelectedAreaMetas[sam_id] = responseJson['selected_area_metas'][sam_id]
          something_changed = true
        }
      }
      if (something_changed) {
        deepCopyT1Scanners['selected_area'] = deepCopySelectedAreaMetas
        this.setGlobalStateVar('tier_1_scanners', deepCopyT1Scanners)
      }
    }
  }

  async loadTelemetryResults(job, when_done=(()=>{})) {
    const responseJson = JSON.parse(job.response_data)
    const req_data = JSON.parse(job.request_data)
    const rule_id = req_data['telemetry_rule']['id']

    let deepCopyTier1Matches = JSON.parse(JSON.stringify(this.state.tier_1_matches))
    let deepCopyTelemetryMatches = deepCopyTier1Matches['telemetry']
    if (!Object.keys(deepCopyTelemetryMatches).includes(rule_id)) {
      deepCopyTelemetryMatches[rule_id] = {}
      deepCopyTelemetryMatches[rule_id]['movies'] = {}
    }
    for (let i=0; i < Object.keys(responseJson['movies']).length; i++) {
      const movie_url = Object.keys(responseJson['movies'])[i]
      const frames = responseJson['movies'][movie_url]
      if (frames && frames.length > 0) {
        deepCopyTelemetryMatches[rule_id]['movies'][movie_url] = frames
      }
    }
    deepCopyTier1Matches['telemetry'] = deepCopyTelemetryMatches  // is this needed?
    this.setGlobalStateVar('tier_1_matches', deepCopyTier1Matches)

    let deepCopyIds = JSON.parse(JSON.stringify(this.state.tier_1_scanner_current_ids))
    deepCopyIds['telemetry'] = rule_id
    this.setGlobalStateVar('tier_1_scanner_current_ids', deepCopyIds)
  }

  async getJobResultData(job_id, when_done=(()=>{})) {
    let job_url = this.getUrl('jobs_url') + '/' + job_id
    await fetch(job_url, {
      method: 'GET',
      headers: this.buildJsonHeaders(),
    })
    .then((response) => response.json())
    .then((responseJson) => {
      const request = JSON.parse(responseJson['job']['request_data'])
      const pretty_request = JSON.stringify(request, undefined, 2)
      const response = JSON.parse(responseJson['job']['response_data'])
      const pretty_response = JSON.stringify(response, undefined, 2)
      delete responseJson['job']['request_data']
      delete responseJson['job']['response_data']
      const pretty_job = JSON.stringify(responseJson, undefined, 2)
      const pretty_composite = (
        '============== JOB CONTROL DATA ===============\n' + 
        pretty_job + 
        "\n\n" + 
        '============== RESPONSE DATA ===============\n' + 
        pretty_response +
        "\n\n" + 
        '============== REQUEST DATA ===============\n' + 
        pretty_request
      )
      when_done(pretty_composite)
    })
  }

  async loadJobResults(job_id, when_done=(()=>{})) {
    let job_url = this.getUrl('jobs_url') + '/' + job_id
    await fetch(job_url, {
      method: 'GET',
      headers: this.buildJsonHeaders(),
    })
    .then((response) => response.json())
    .then((responseJson) => {
			const job = responseJson['job']
			if ((job.app === 'analyze' && job.operation === 'scan_template')
			   || (job.app === 'analyze' && job.operation === 'scan_template_multi')
			   || (job.app === 'analyze' && job.operation === 'scan_template_threaded')) {
        this.loadTemplateResults(job, when_done)
			} else if (job.app === 'analyze' && job.operation === 'filter') {
        this.loadFilterResults(job, when_done)
			} else if (job.app === 'analyze' && job.operation === 'get_timestamp_threaded') {
        this.loadGetTimestampResults(job, when_done)
			} else if ((job.app === 'analyze' && job.operation === 'template_match_chart')  ||
          (job.app === 'analyze' && job.operation === 'selected_area_chart') ||
          (job.app === 'analyze' && job.operation === 'ocr_match_chart')) {
        this.loadGetMovieMatchChartResults(job, when_done)
			} else if (job.app === 'analyze' && job.operation === 'ocr_scene_analysis_chart') {
        this.loadGetFramesetMatchChartResults(job, when_done)
			} else if (job.app === 'analyze' && job.operation === 'scan_ocr') {
        this.loadOcrResults(job, when_done)
			} else if (job.app === 'analyze' && job.operation === 'hog_test') {
        this.loadHogTestResults(job, when_done)
			} else if (job.app === 'analyze' && job.operation === 'hog_train_threaded') {
        this.loadHogTrainResults(job, when_done)
			} else if (job.app === 'analyze' && job.operation === 'telemetry_find_matching_frames') {
        this.loadTelemetryResults(job, when_done)
			} else if (job.app === 'analyze' && job.operation === 'ocr_scene_analysis_threaded') {
        this.loadOcrSceneAnalysisResults(job, when_done)
			} else if (job.app === 'analyze' && job.operation === 'oma_first_scan_threaded') {
        this.loadOmaScanResults(job, when_done)
			} else if (job.app === 'analyze' && job.operation === 'selected_area_threaded') {
        this.loadSelectedAreaResults(job, when_done)
			} else if ((job.app === 'parse' && job.operation === 'split_and_hash_threaded')) {
        this.loadMoviesFromJobResults(job, when_done)
			} else if (job.app === 'pipeline'  && 
          job.operation === 'pipeline' && 
          job.description === 'top level job for pipeline fetch_split_hash_secure_file') {
        this.loadMoviesFromJobResults(job, when_done)
			} else if (job.app === 'parse' && job.operation === 'split_threaded') {
        this.loadSplitResults(job, when_done)
			} else if (job.app === 'parse' && job.operation === 'hash_movie') {
        this.loadHashResults(job, when_done)
			} else if (job.app === 'parse' && job.operation === 'copy_movie') {
        this.loadCopyResults(job, when_done)
			} else if (job.app === 'parse' && job.operation === 'rebase_movies') {
        this.loadRebaseMoviesResults(job, when_done)
			} else if (job.app === 'parse' && job.operation === 'rebase_jobs') {
        this.getJobs() 
			} else if (job.app === 'parse' && job.operation === 'change_movie_resolution') {
        this.loadChangeResolutionResults(job, when_done)
			} else if (job.app === 'parse' && job.operation === 'render_subsequence') {
        this.loadRenderSubsequenceResults(job, when_done)
			} else if (job.app === 'redact' && job.operation === 'redact') {
        this.loadRedactResults(job, when_done)
			} else if (job.app === 'redact' && job.operation === 'redact_single') {
        this.loadRedactSingleResults(job, when_done)
			} else if (job.app === 'parse' && job.operation === 'zip_movie') {
        this.loadZipMovieResults(job, when_done)
			} else if (job.app === 'redact' && job.operation === 'illustrate') {
        this.loadIllustrateResults(job, when_done)
			} else if (job.app === 'files' && job.operation === 'load_movie_metadata') {
        this.loadLoadMovieMetadataResults(job, when_done)
      }
      this.playTone()
    })
    .then(() => {
      if (Object.keys(this.state.whenJobLoaded).includes(job_id)) {
        const deleteJob = this.state.whenJobLoaded[job_id]['delete']
        if (deleteJob) {
          this.cancelJob(job_id)
        }
        this.unwatchJob(job_id)
      }
    })
    .catch((error) => {
      console.error(error);
    })
  }

  async getJobs() {
    let the_url = this.getUrl('jobs_url')
    the_url += '?x=1'
    if (this.state.current_workbook_id) {
      the_url += '&workbook_id=' + this.state.current_workbook_id
    } 
    if (this.state.user) {
      the_url += '&user_id=' + this.state.user['id']
    }
    await fetch(the_url, {
      method: 'GET',
      headers: this.buildJsonHeaders(),
    })
    .then((response) => response.json())
    .then((responseJson) => {
      this.setGlobalStateVar('jobs', responseJson['jobs'])
    })
    .catch((error) => {
      console.error(error);
    })
  }

  async wrapUpJob(job_id) {
    await fetch(this.getUrl('wrap_up_job_url'), {
      method: 'POST',
      headers: this.buildJsonHeaders(),
      body: JSON.stringify({
        job_id: job_id,
      }),
    })
    .then(() => {
      this.getJobs()
    })
    .catch((error) => {
      console.error(error);
    })
  }

  attachToJob(job_id) {
    let job_status = ''
    let job_percent_done = ''
    for (let i=0; i < this.state.jobs.length; i++) {
      const job = this.state.jobs[i]
      if (job['id'] === job_id) {
        job_status = job['status']
        job_percent_done = job['elapsed_time']
      }
    }
    const attached_job = {
      id: job_id,
      status: job_status,
      percent_done: job_percent_done,
    }
    this.watchForJob(job_id)
    this.setGlobalStateVar('attached_job', attached_job)
  }

  async getPipelines() {
    let the_url = this.getUrl('pipelines_url')
    await fetch(the_url, {
      method: 'GET',
      headers: this.buildJsonHeaders(),
    })
    .then((response) => response.json())
    .then((responseJson) => {
      if (Object.keys(responseJson).includes('pipelines')) {
        const pipelines_list = responseJson['pipelines']
        let pipelines_hash = {}
        for (let i=0; i < pipelines_list.length; i++) {
          pipelines_hash[pipelines_list[i]['id']] = pipelines_list[i]
        }
        this.setGlobalStateVar('pipelines', pipelines_hash)
      }
    })
    .catch((error) => {
      console.error(error);
    })
  }

  async dispatchPipeline(the_uuid, scope, extra_data, when_done=(()=>{})) {
    let the_url = this.getUrl('pipelines_url') + '/dispatch'
    let build_movies = {}
    let specified_input = {}
    if (scope === 'all_movies') {
      for (let i=0; i < this.state.campaign_movies.length; i++) {
        build_movies[this.state.campaign_movies[i]] = {}
      }
      specified_input['movies'] = build_movies
    } else if (scope === 'current_movie') {
      build_movies[this.state.movie_url] = {}
      specified_input['movies'] = build_movies
    } else if (scope === 'json_obj') {
      specified_input = extra_data
    }
    let build_payload = {
      pipeline_id: the_uuid,
      input: specified_input,
    }
    if (this.state.current_workbook_id) {
      build_payload['workbook_id'] = this.state.current_workbook_id
    } 
    await fetch(the_url, {
      method: 'POST',
      headers: this.buildJsonHeaders(),
      body: JSON.stringify(build_payload)
    })
    .then((response) => response.json())
    .then((responseJson) => {
      this.watchForJob(responseJson['job_id'], (()=>{}), false)
      this.getPipelines()
      when_done(responseJson)
    })
    .catch((error) => {
      console.error(error);
    })
  }

  async deletePipeline(the_uuid, when_done=(()=>{})) {
    let the_url = this.getUrl('pipelines_url') + '/' + the_uuid
    await fetch(the_url, {
      method: 'DELETE',
      headers: this.buildJsonHeaders(),
    })
    .then(() => {
      this.getPipelines()
      when_done()
    })
    .catch((error) => {
      console.error(error);
    })
  }

  async savePipelineToDatabase(pipeline_obj, when_done=(()=>{})) {
    let description_string = ''
    if (Object.keys(pipeline_obj).includes('description')) {
      description_string = pipeline_obj['description']
    }
    let response = await fetch(this.getUrl('pipelines_url'), {
      method: 'POST',
      headers: this.buildJsonHeaders(),
      body: JSON.stringify({
        name: pipeline_obj['name'],
        description: description_string,
        content: pipeline_obj,
      }),
    })
    .then((response) => response.json())
    .then((responseJson) => {
      this.getPipelines()
      when_done(responseJson)
    })
    .catch((error) => {
      console.error(error)
    })
    await response
  }

  async getFiles() {
    let the_url = this.getUrl('files_url')
    await fetch(the_url, {
      method: 'GET',
      headers: this.buildJsonHeaders(),
    })
    .then((response) => response.json())
    .then((responseJson) => {
      this.setGlobalStateVar('files', responseJson)
    })
    .catch((error) => {
      console.error(error);
    })
  }

  async deleteFile(the_uuid, when_done=(()=>{})) {
    let the_url = this.getUrl('files_url') + '/' + the_uuid
    await fetch(the_url, {
      method: 'DELETE',
      headers: this.buildJsonHeaders(),
    })
    .then(() => {
      this.getFiles()
      when_done()
    })
    .catch((error) => {
      console.error(error);
    })
  }

  async submitJob(hash_in) {
    let the_job_data = hash_in.hasOwnProperty('job_data')? hash_in['job_data'] : {}
    let when_submit_complete = hash_in.hasOwnProperty('after_submit')? hash_in['after_submit'] : (()=>{})
    let cancel_after_loading = hash_in.hasOwnProperty('cancel_after_loading')? hash_in['cancel_after_loading'] : false
    let when_fetched = hash_in.hasOwnProperty('after_loaded')? hash_in['after_loaded'] : (()=>{})
    let when_failed = hash_in.hasOwnProperty('when_failed')? hash_in['when_failed'] : (()=>{})
    let current_user = ''
    if (this.state.user && Object.keys(this.state.user).includes('id')) {
      current_user = this.state.user['id']
    }
    let build_obj = {
      app: the_job_data['app'],
      operation: the_job_data['operation'],
      request_data: the_job_data['request_data'],
      response_data: the_job_data['response_data'],
      owner: current_user,
      description: the_job_data['description'],
      workbook_id: this.state.current_workbook_id,
    }
    await fetch(this.getUrl('jobs_url'), {
      method: 'POST',
      headers: this.buildJsonHeaders(),
      body: JSON.stringify(build_obj),
    })
    .then((response) => response.json())
    .then((responseJson) => {
      when_submit_complete(responseJson)
      return responseJson
    })
    .then((responseJson) => {
      this.watchForJob(responseJson['job_id'], when_fetched, cancel_after_loading)
    })
    .then(() => {
      this.getJobs()
    })
    .catch((error) => {
      console.error(error);
      when_failed()
    })
  }

  async cancelJob(job_id) {
    let the_url = this.getUrl('jobs_url') + '/' + job_id
    await fetch(the_url, {
      method: 'DELETE',
      headers: this.buildJsonHeaders(),
    })
    .then(() => {
      this.getJobs()
    })
    .catch((error) => {
      console.error(error);
    })
  }

  async getWorkbooks() {
    let the_url = this.getUrl('workbooks_url')
    the_url += '?x=1'
    if (this.state.user) {
      the_url += '&user_id=' + this.state.user['id']
    }
    await fetch(the_url, {
      method: 'GET',
      headers: this.buildJsonHeaders(),
    })
    .then((response) => response.json())
    .then((responseJson) => {
      this.setWorkbooks(responseJson['workbooks'])
    })
    .catch((error) => {
      console.error(error);
    })
  }

  saveWorkbookName(the_name) {
    let new_workbook_id = ''
    for (let i=0; i < this.state.workbooks.length; i++) {
      if (this.state.workbooks[i]['name'] === the_name) {
        new_workbook_id = this.state.workbooks[i]['id']
      }
    }
    this.setState({
      current_workbook_name: the_name,
      current_workbook_id: new_workbook_id,
    })
  }

  async saveWorkbook(when_done=(()=>{})) {
    let current_user = ''
    if (this.state.user && Object.keys(this.state.user).includes('id')) {
      current_user = this.state.user['id']
    }
    await fetch(this.getUrl('workbooks_url'), {
      method: 'POST',
      headers: this.buildJsonHeaders(),
      body: JSON.stringify({
        state_data: this.state,
        owner: current_user,
        name: this.state.current_workbook_name,
        play_sound: this.state.current_workbook_play_sound,
      }),
    })
    .then((response) => response.json())
    .then((responseJson) => {
      this.setState({
        current_workbook_id: responseJson['workbook_id']
      })
      this.getWorkbooks()
      // delete/load buttons aren't updating on BottomInsightsControl so force em
      this.forceUpdate()
    })
    .then(() => {
      when_done()
    })
    .catch((error) => {
      console.error(error);
    })
  }

  async loadWorkbook(workbook_id, when_done=(()=>{})) {
    if (workbook_id === '-1') {
      this.setState({
        current_workbook_id: '',
      })
      when_done()
      return
    }
    let wb_url = this.getUrl('workbooks_url') + '/' + workbook_id
    await fetch(wb_url, {
      method: 'GET',
      headers: this.buildJsonHeaders(),
    })
    .then((response) => response.json())
    .then((responseJson) => {
      const dont_add_keys = ['workbooks', 'jobs', 'workbooks_url', 'whenDoneTarget']
      let wb = responseJson['workbook']
      let wb_state_data = JSON.parse(wb.state_data)
      let wb_keys = Object.keys(wb_state_data)
      let new_state = {}
      for (let j=0; j < wb_keys.length; j++) {
        let state_data_key = wb_keys[j]
        if (!dont_add_keys.includes(state_data_key)) {
          new_state[state_data_key] = wb_state_data[state_data_key]
        }
      } 
      new_state['current_workbook_name'] = wb.name
      new_state['current_workbook_id'] = wb.id
      this.setState(new_state)
    })
    .then(() => {
      this.getJobs()
    })
    .then(() => {
      when_done()
    })
    .catch((error) => {
      console.error(error);
    })
  }

  async deleteWorkbook(workbook_id, when_done=(()=>{})) {
    let the_url = this.getUrl('workbooks_url')+ '/' + workbook_id
    await fetch(the_url, {
      method: 'DELETE',
      headers: this.buildJsonHeaders(),
    })
    .then(() => {
      this.getWorkbooks()
      // delete/load buttons aren't updating on BottomInsightsControl so force em
      this.forceUpdate()
    })
    .then(() => {
      when_done()
    })
    .catch((error) => {
      console.error(error);
    })
  }

  getImageUrl(frameset_hash='') {
    frameset_hash = frameset_hash || this.state.frameset_hash
    return this.getImageFromFrameset(frameset_hash)
  }

  getRedactedImageUrl() {
    if (this.state.movie_url) {
      if (Object.keys(this.state.movies).includes(this.state.movie_url)) {
        let movie = this.state.movies[this.state.movie_url]
        if (Object.keys(movie['framesets']).includes(this.state.frameset_hash)) {
          if (Object.keys(movie['framesets'][this.state.frameset_hash]).includes('redacted_image')) {
            return movie['framesets'][this.state.frameset_hash]['redacted_image']
          }
        }
      }
    }
  }

  getFramesetHashForImageUrl = (image_url, framesets=null) => {
    if (framesets === null) {
      framesets = this.getCurrentFramesets()
    }
    if (!framesets) {
      return
    }

    const hashes = Object.keys(framesets)
    for (let i=0; i < hashes.length; i++) {
      let the_images = framesets[hashes[i]]['images']
      if (the_images.includes(image_url)) {
        return hashes[i]
      }
      if (Object.keys(framesets[hashes[i]]).includes('redacted_image')) {
        const redacted_image = framesets[hashes[i]]['redacted_image']
        if (redacted_image === image_url) {
          return hashes[i]
        }
      }
      if (Object.keys(framesets[hashes[i]]).includes('illustrated_image')) {
        const redacted_image = framesets[hashes[i]]['illustrated_image']
        if (redacted_image === image_url) {
          return hashes[i]
        }
      }
    }
  }

  async dispatchFetchSplitAndHash(recording_id) {
    await this.getPipelines();
    const input_obj = {
      'recording_ids': [recording_id],
    }
    let fetch_split_pipeline_id = ''
    for (let i=0; i < Object.keys(this.state.pipelines).length; i++) {
      const pipeline_id = Object.keys(this.state.pipelines)[i]
      const pipeline = this.state.pipelines[pipeline_id]
      if (pipeline['name'] === 'fetch_split_hash_secure_file') {
        fetch_split_pipeline_id = pipeline_id
      }
    }
    if (!fetch_split_pipeline_id) {
      console.log('no fetch and split pipeline found, aborting')
      return
    }
    let when_done_fun = ((response) => {
      if (Object.keys(response).includes("job_id")) {
        this.props.attachToJob(response['job_id'])
      }
    })
    this.props.dispatchPipeline(fetch_split_pipeline_id, 'json_obj', input_obj, when_done_fun)
  }

  checkForInboundGetParameters() {
    let vars = getUrlVars()
    if (Object.keys(vars).includes('when_done')) {
      this.saveWhenDoneInfo(vars['when_done'])
    } 
    if (Object.keys(vars).includes('workbook_id')) {
      this.loadWorkbook(vars['workbook_id'])
    }
    if (Object.keys(vars).includes('recording-id')) {
      this.dispatchFetchSplitAndHash(vars['recording-id']) 
      this.setGlobalStateVar('whenDoneTarget', 'learn_dev')
    }
    if (Object.keys(vars).includes('movie_url')) {
        this.handleSetMovieUrl(vars['movie_url'])
        document.getElementById('movie_panel_link').click()
    } else if (Object.keys(vars).includes('image_uuid') && Object.keys(vars).includes('offsets')) {
        this.handleSetImageUuid(vars['image_uuid'], vars['offsets'])
        this.getImagesForUuid(vars['image_uuid'], vars['offsets'], this.afterUuidImagesFetched)
        document.getElementById('image_panel_link').click()
    }
  }

  getNextImageHash() {
    let hashes = this.getFramesetHashesInOrder()
    if (hashes.length < 2) {
      return ''
    }
    if (this.state.frameset_hash) {
      let cur_index = hashes.indexOf(this.state.frameset_hash)
      if (cur_index < (hashes.length-1)) {
        return hashes[cur_index + 1]
      } 
    }
    return ''
  }

  getPrevImageHash() {
    let hashes = this.getFramesetHashesInOrder()
    if (this.state.frameset_hash) {
      let cur_index = hashes.indexOf(this.state.frameset_hash)
      if (cur_index > 0) {
        return hashes[cur_index - 1]
      } 
    }
    return ''
  }

  handleMaximize() {
    if (this.state.maximize) {
      if (document.getElementById('App-whoami')) {
        document.getElementById('App-whoami').parentNode.parentNode.style.display='none'
      }
    }
  }

  makeNewFrameFrameset(the_url) {
    if (!Object.keys(this.state.movies).length) {
      let new_frameset_hash = '1'
      let new_movie_url = 'whatever'
      let new_frameset = {
        images: [the_url]
      }
      let framesets = {}
      framesets[new_frameset_hash] = new_frameset
      let new_movie = {
        frames: [the_url],
        framesets: framesets,
      }
      let movies = {}
      movies[new_movie_url] = new_movie
      this.setState({
        movies: movies,
        movie_url: new_movie_url,
      })
      return new_frameset_hash
    }
    return 999  // don't expect to ever get here
  }

  handleSetMovieUrl = (the_url) => {
    // TODO have this check campaign_movies  to see if we already have framesets and frames
    this.setState({
      movie_url: the_url,
      image_url: '',
      frameset_hash: '',
      showMovieParserLink: true,
    })
    document.getElementById('movie_panel_link').style.display = 'block'
  }

  handleUpdateFrameset = (the_hash, the_frameset) => {
    let deepCopyMovies= JSON.parse(JSON.stringify(this.state.movies))
    deepCopyMovies[this.state.movie_url]['framesets'][the_hash] = the_frameset
    this.setGlobalStateVar('movies', deepCopyMovies)
  }

  handleMergeFramesets = (target_hash, source_hash) => {
    let deepCopyFramesets = JSON.parse(JSON.stringify(this.getCurrentFramesets()))
    const source_frameset = deepCopyFramesets[source_hash]
    let new_target_frameset = deepCopyFramesets[target_hash]
    let new_target_images = new_target_frameset['images'].concat(source_frameset['images'])
    if (new_target_frameset['areas_to_redact']) {
      if (source_frameset['areas_to_redact']) {
        let new_a2r = new_target_frameset['areas_to_redact'].concat(source_frameset['areas_to_redact'])
        new_target_frameset['areas_to_redact'] = new_a2r
      }
    } else if (source_frameset['areas_to_redact']) {
      new_target_frameset['areas_to_redact'] = source_frameset['areas_to_redact']
    }
    new_target_frameset['images'] = new_target_images
    deepCopyFramesets[target_hash] = new_target_frameset
    delete deepCopyFramesets[source_hash]
    let deepCopyMovies = JSON.parse(JSON.stringify(this.state.movies))
    let cur_movie = deepCopyMovies[this.state.movie_url]
    cur_movie['framesets'] = deepCopyFramesets
    deepCopyMovies[this.state.movie_url] = cur_movie
    this.setGlobalStateVar('movies', deepCopyMovies)
  }

  addRedactionToFrameset = (areas_to_redact) => {
    let deepCopyFramesets = JSON.parse(JSON.stringify(this.getCurrentFramesets()))
    deepCopyFramesets[this.state.frameset_hash]['areas_to_redact'] = areas_to_redact
    let deepCopyMovies = JSON.parse(JSON.stringify(this.state.movies))
    let cur_movie = deepCopyMovies[this.state.movie_url]
    cur_movie['framesets'] = deepCopyFramesets
    deepCopyMovies[this.state.movie_url] = cur_movie
    this.setGlobalStateVar('movies', deepCopyMovies)
  }

  getRedactionFromFrameset = (frameset_hash) => {
    const framesets = this.getCurrentFramesets()
    if (!framesets || !this.state.frameset_hash) {
        return []
    }
    let the_hash = frameset_hash || this.state.frameset_hash
    let frameset = framesets[the_hash]
    if (frameset) {
      if (Object.keys(frameset).indexOf('areas_to_redact') > -1) {
          return frameset['areas_to_redact']
      } else {
          return []
      }
    } else {
      return []
    }
  }

  getImageFromFrameset(frameset_hash, framesets)  {
    frameset_hash = frameset_hash || this.state.frameset_hash
    framesets = framesets || this.getCurrentFramesets()
    let the_image_url = ''
    if (Object.keys(framesets).includes(frameset_hash)) {
      the_image_url = framesets[frameset_hash]['images'][0]
    }
    if (this.getRedactedImageFromFrameset(frameset_hash, framesets)) {
      the_image_url = this.getRedactedImageFromFrameset(frameset_hash, framesets)
    }
    if (this.getIllustratedImageFromFrameset(frameset_hash, framesets)) {
      the_image_url = this.getIllustratedImageFromFrameset(frameset_hash, framesets)
    }
    return the_image_url
  }

  getRedactedImageFromFrameset = (frameset_hash, framesets) => {
    framesets = framesets || this.getCurrentFramesets()
    let the_hash = frameset_hash || this.state.frameset_hash
    let frameset = framesets[the_hash]
    if (frameset) {
      if (Object.keys(frameset).includes('redacted_image')) {
          return frameset['redacted_image']
      } else {
          return ''
      }
    } else {
      return ''
    }
  }

  getIllustratedImageFromFrameset = (frameset_hash, framesets) => {
    framesets = framesets || this.getCurrentFramesets()
    let the_hash = frameset_hash || this.state.frameset_hash
    let frameset = framesets[the_hash]
    if (frameset) {
      if (Object.keys(frameset).includes('illustrated_image')) {
          return frameset['illustrated_image']
      } else {
          return ''
      }
    } else {
      return ''
    }
  }

  render() {
    this.handleMaximize()
    if (document.getElementById('movie_panel_link') && this.state.showMovieParserLink) {
      document.getElementById('movie_panel_link').style.display = 'block'
    }
    return (
      <div>
        <nav className="navbar navbar-expand-lg navbar-dark bg-dark">
        <ul className="navbar-nav mr-auto mt-2 mt-lg-0">
          <li className="nav-item">
            <Link className='nav-link' id='image_panel_link' to='/redact/image'>Image</Link>
          </li>
          <li className="nav-item">
            <Link className='nav-link' id='movie_panel_link' to='/redact/movie'>Movie</Link>
          </li>
          <li className="nav-item">
            <Link className='nav-link' id='compose_link' to='/redact/compose'>Compose</Link>
          </li>
          <li className="nav-item">
            <Link className='nav-link' id='insights_link' to='/redact/insights'>Insights</Link>
          </li>
        </ul>
        <div className='float-right nav-link'>
          <a id='help_link'  href={helpDoc}>
            help
          </a>
        </div>
        </nav>
        <div id='container' className='col'>
          <Switch>
            <Route path='/redact/movie'>
              <MoviePanel 
                setGlobalStateVar={this.setGlobalStateVar}
                toggleGlobalStateVar={this.toggleGlobalStateVar}
                movie_url = {this.state.movie_url}
                getCurrentFramesets={this.getCurrentFramesets}
                mask_method = {this.state.mask_method}
                setFramesetHash={this.setFramesetHash}
                getRedactionFromFrameset={this.getRedactionFromFrameset}
                getImageFromFrameset={this.getImageFromFrameset}
                getRedactedImageFromFrameset={this.getRedactedImageFromFrameset}
                getFramesetHashForImageUrl={this.getFramesetHashForImageUrl}
                handleMergeFramesets={this.handleMergeFramesets}
                movies={this.state.movies}
                frameset_discriminator={this.state.frameset_discriminator}
                getRedactedMovieUrl={this.getRedactedMovieUrl}
                setMovieRedactedUrl={this.setMovieRedactedUrl}
                templates={this.state.tier_1_scanners['template']}
                getFramesetHashesInOrder={this.getFramesetHashesInOrder}
                getJobs={this.getJobs}
                submitJob={this.submitJob}
                loadJobResults={this.loadJobResults}
                jobs={this.state.jobs}
                postMakeUrlCall={this.postMakeUrlCall}
                establishNewMovie={this.establishNewMovie}
                preserve_movie_audio={this.state.preserve_movie_audio}
                message={this.state.message}
                getAndSaveUser={this.getAndSaveUser}
              />
            </Route>
            <Route path='/redact/image'>
              <ImagePanel 
                setGlobalStateVar={this.setGlobalStateVar}
                mask_method={this.state.mask_method}
                movies={this.state.movies}
                movie_url = {this.state.movie_url}
                getImageUrl={this.getImageUrl}
                image_width={this.state.image_width}
                image_height={this.state.image_height}
                image_scale={this.state.image_scale}
                addRedactionToFrameset={this.addRedactionToFrameset}
                getRedactionFromFrameset={this.getRedactionFromFrameset}
                setFramesetHash={this.setFramesetHash}
                getFramesetHashForImageUrl={this.getFramesetHashForImageUrl}
                getNextImageHash={this.getNextImageHash}
                getPrevImageHash={this.getPrevImageHash}
                setImageScale={this.setImageScale}
                clearCurrentFramesetChanges={this.clearCurrentFramesetChanges}
                whenDoneTarget={this.state.whenDoneTarget}
                gotoWhenDoneTarget={this.gotoWhenDoneTarget}
                submitJob={this.submitJob}
                playTone={this.playTone}
                postMakeUrlCall={this.postMakeUrlCall}
                establishNewEmptyMovie={this.establishNewEmptyMovie}
                addImageToMovie={this.addImageToMovie}
                illustrateParameters={this.state.illustrateParameters}
                setIllustrateParameters={this.setIllustrateParameters}
                message={this.state.message}
                tier_1_scanners={this.state.tier_1_scanners}
                tier_1_scanner_current_ids={this.state.tier_1_scanner_current_ids}
                cropImage={this.cropImage}
                getAndSaveUser={this.getAndSaveUser}
              />
            </Route>
            <Route path='/redact/compose'>
              <ComposePanel 
                setGlobalStateVar={this.setGlobalStateVar}
                movies={this.state.movies}
                establishNewEmptyMovie={this.establishNewEmptyMovie}
                addImageToMovie={this.addImageToMovie}
                movie_url = {this.state.movie_url}
                getCurrentFrames={this.getCurrentFrames}
                whenDoneTarget={this.state.whenDoneTarget}
                gotoWhenDoneTarget={this.gotoWhenDoneTarget}
                setFramesetHash={this.setFramesetHash}
                getFramesetHashForImageUrl={this.getFramesetHashForImageUrl}
                getFramesetHashesInOrder={this.getFramesetHashesInOrder}
                getImageFromFrameset={this.getImageFromFrameset}
                getImageUrl={this.getImageUrl}
                subsequences={this.state.subsequences}
                submitJob={this.submitJob}
                telemetry_data={this.state.telemetry_data}
                readTelemetryRawData={this.readTelemetryRawData}
                pipelines={this.state.pipelines}
                dispatchPipeline={this.dispatchPipeline}
                attachToJob={this.attachToJob}
                message={this.state.message}
                getAndSaveUser={this.getAndSaveUser}
              />
            </Route>
            <Route path='/redact/insights'>
              <InsightsPanel  
                setGlobalStateVar={this.setGlobalStateVar}
                toggleGlobalStateVar={this.toggleGlobalStateVar}
                getFramesetHashesInOrder={this.getFramesetHashesInOrder}
                setMovieUrlCallback={this.handleSetMovieUrl}
                getFramesetHashForImageUrl={this.getFramesetHashForImageUrl}
                movie_url={this.state.movie_url}
                movies={this.state.movies}
                getCurrentFramesets={this.getCurrentFramesets}
                doPing={this.doPing}
                doGetVersion={this.doGetVersion}
                cancelJob={this.cancelJob}
                submitJob={this.submitJob}
                getJobs={this.getJobs}
                jobs={this.state.jobs}
                loadJobResults={this.loadJobResults}
                getWorkbooks={this.getWorkbooks}
                saveWorkbook={this.saveWorkbook}
                saveWorkbookName={this.saveWorkbookName}
                session_audio={this.state.session_audio}
                loadWorkbook={this.loadWorkbook}
                deleteWorkbook={this.deleteWorkbook}
                workbooks={this.state.workbooks}
                current_workbook_name={this.state.current_workbook_name}
                current_workbook_id={this.state.current_workbook_id}
                setSelectedAreaMetas={this.setSelectedAreaMetas}
                annotations={this.state.annotations}
                cropImage={this.cropImage}
                setMovieNickname={this.setMovieNickname}
                movie_sets={this.state.movie_sets}
                frameset_discriminator={this.state.frameset_discriminator}
                setActiveMovie={this.setActiveMovie}
                updateGlobalState={this.updateGlobalState}
                campaign_movies={this.state.campaign_movies}
                setCampaignMovies={this.setCampaignMovies}
                whenDoneTarget={this.state.whenDoneTarget}
                files={this.state.files}
                getFiles={this.getFiles}
                deleteFile={this.deleteFile}
                preserveAllJobs={this.state.preserveAllJobs}
                tier_1_matches={this.state.tier_1_matches}
                telemetry_data={this.state.telemetry_data}
                setTelemetryData={this.setTelemetryData}
                getJobResultData={this.getJobResultData}
                saveScannerToDatabase={this.saveScannerToDatabase}
                scanners={this.state.scanners}
                getScanners={this.getScanners}
                deleteScanner={this.deleteScanner}
                importScanner={this.importScanner}
                wrapUpJob={this.wrapUpJob}
                attachToJob={this.attachToJob}
                preserve_movie_audio={this.state.preserve_movie_audio}
                pipelines={this.state.pipelines}
                current_pipeline_id={this.state.current_pipeline_id}
                getPipelines={this.getPipelines}
                dispatchPipeline={this.dispatchPipeline}
                deletePipeline={this.deletePipeline}
                savePipelineToDatabase={this.savePipelineToDatabase}
                results={this.state.results}
                app_codebooks={this.state.app_codebooks}
                tier_1_scanners={this.state.tier_1_scanners}
                tier_1_scanner_current_ids={this.state.tier_1_scanner_current_ids}
                mask_method={this.state.mask_method}
                visibilityFlags={this.state.visibilityFlags}
                toggleShowVisibility={this.toggleShowVisibility}
                impersonateUser={this.impersonateUser}
                attached_job={this.state.attached_job}
                message={this.state.message}
                maximize={this.state.maximize}
                getAndSaveUser={this.getAndSaveUser}
              />
            </Route>
          </Switch>
        </div>
      </div>
    );
  }
}

export default RedactApplication;
