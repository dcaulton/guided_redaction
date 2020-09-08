
import React from 'react';
import MoviePanel from './MoviePanel';
import JobBug from './JobBug';
import Pipelines from './Pipelines';
import InsightsPanel from './InsightsPanel';
import Workflows from './Workflows';
import Workbooks from './Workbooks';
import ComposePanel from './ComposePanel';
import {getUrlVars} from './redact_utils.js'
import './styles/guided_redaction.css';
import { fetch } from '../../utils'; 
import {
  Switch,
  Route,
  Link
} from "react-router-dom";

class RedactApplication extends React.Component {
  constructor(props) {
    super(props);
    const api_server_url = ''
    const api_key = ''
    this.state = {
      api_server_url: api_server_url,
      api_key: api_key,
      frameset_discriminator: 'gray8',
      redact_rule: {
        mask_method: 'black_rectangle',
        replace_with: 'eroded',
        erode_iterations: 1,
      },
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
      breadcrumbs_title: '',
      breadcrumbs_subtitle: '',
      bypass_whoami: false,
      jobs: [],
      jobs_last_checked: '',
      job_polling_interval_seconds: 2,
      scanners: [],
      files: {},
      subsequences: {},
      showMovieParserLink: true,
      showInsightsLink: true,
      showComposeLink: true,
      whenJobLoaded: {},
      whenDoneTarget: 'learn_dev',
      campaign_movies: [],
      illustrateParameters: {
        color: '#CCCC00',
        backgroundDarkenPercent: .5,
        lineWidth: 5,
      },
      attached_job: {
        id: '',
        status: '',
        percent_complete: '',
      },
      sideNavIsCollapsed: false,
      preserveAllJobs: false,
      pipelines: {},
      results: {},
      current_pipeline_id: '',
      preserve_movie_audio: true,
      app_codebooks: {},
      telemetry_data: {
        raw_data_url: '',
        movie_mappings: [],
      },
      user: {
        id: '',
      },
      message: '',
      cv_workers: {},
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
        'redaction_borders': true,
      },
      tier_1_scanners: {
        'ocr': {},
        'hog': {},
        'ocr_scene_analysis': {},
        'template': {},
        'telemetry': {},
        'selected_area': {},
      },
      tier_1_scanner_current_ids: {
        'ocr': '',
        'hog': '',
        'ocr_scene_analysis': '',
        'template': '',
        'telemetry': '',
        'selected_area': '',
      },
      tier_1_matches: {
        'ocr': {},
        'hog': {},
        'hog_training': {},
        'ocr_scene_analysis': {},
        'template': {},
        'telemetry': {},
        'selected_area': {},
      },
      workflow_callbacks: {},
      workflows: {
        'active_workflow': '',
        'active_step': '',
      },
    }

    this.handleMergeFramesets=this.handleMergeFramesets.bind(this)
    this.setImageScale=this.setImageScale.bind(this)
    this.doPing=this.doPing.bind(this)
    this.getUrl=this.getUrl.bind(this)
    this.buildJsonHeaders=this.buildJsonHeaders.bind(this)
    this.doGetVersion=this.doGetVersion.bind(this)
    this.cancelJob=this.cancelJob.bind(this)
    this.submitJob=this.submitJob.bind(this)
    this.getJobs=this.getJobs.bind(this)
    this.deleteOldJobs=this.deleteOldJobs.bind(this)
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
    this.updateSingleImageMovie=this.updateSingleImageMovie.bind(this)
    this.postMakeUrlCall=this.postMakeUrlCall.bind(this)
    this.establishNewMovie=this.establishNewMovie.bind(this)
    this.establishNewEmptyMovie=this.establishNewEmptyMovie.bind(this)
    this.setCampaignMovies=this.setCampaignMovies.bind(this)
    this.addImageToMovie=this.addImageToMovie.bind(this)
    this.setIllustrateParameters=this.setIllustrateParameters.bind(this)
    this.getImageUrl=this.getImageUrl.bind(this)
    this.setFramesetHash=this.setFramesetHash.bind(this)
    this.getJobResultData=this.getJobResultData.bind(this)
    this.setGlobalStateVar=this.setGlobalStateVar.bind(this)
    this.toggleGlobalStateVar=this.toggleGlobalStateVar.bind(this)
    this.saveScannerToDatabase=this.saveScannerToDatabase.bind(this)
    this.getScanners=this.getScanners.bind(this)
    this.deleteScanner=this.deleteScanner.bind(this)
    this.importScanner=this.importScanner.bind(this)
    this.wrapUpJob=this.wrapUpJob.bind(this)
    this.attachToJob=this.attachToJob.bind(this)
    this.toggleShowVisibility=this.toggleShowVisibility.bind(this)
    this.impersonateUser=this.impersonateUser.bind(this)
    this.getAndSaveUser=this.getAndSaveUser.bind(this)
    this.queryCvWorker=this.queryCvWorker.bind(this)
    this.dispatchFetchSplitAndHash=this.dispatchFetchSplitAndHash.bind(this)
    this.setActiveWorkflow=this.setActiveWorkflow.bind(this)
    this.addWorkflowCallbacks=this.addWorkflowCallbacks.bind(this)
    this.clearCurrentIllustrations=this.clearCurrentIllustrations.bind(this)
    this.clearCurrentRedactions=this.clearCurrentRedactions.bind(this)
    this.runTemplateRedactPipelineJob=this.runTemplateRedactPipelineJob.bind(this)
    this.runOcrRedactPipelineJob=this.runOcrRedactPipelineJob.bind(this)
    this.buildMoviesForSingleFrame=this.buildMoviesForSingleFrame.bind(this)
    this.buildMoviesForAllFrames=this.buildMoviesForAllFrames.bind(this)
    this.keyPress=this.keyPress.bind(this)
    this.buildWorkflowBottomNav=this.buildWorkflowBottomNav.bind(this)
  }

  buildOcrRedactPipelineObject(ocr_rule, pipeline_name) {
    return Pipelines.buildOcrRedactPipelineObject(ocr_rule, pipeline_name) 
  }

  buildTemplateRedactPipelineObject(template_id, pipeline_name) {
    return Pipelines.buildTemplateRedactPipelineObject(
      template_id, 
      pipeline_name, 
      this.state.tier_1_scanners
    )
  }

  runOcrRedactPipelineJob(ocr_rule, movies_to_process, pipeline_job_props={}) {
    let input_obj = {
      movies: movies_to_process
    }
    input_obj['redact_rule'] = this.state.redact_rule

    const pipeline_name = 'scan_ocr_and_redact_' + ocr_rule['id'].toString()
    const pipeline = this.getPipelineForName(pipeline_name)
    if (pipeline) {
      this.dispatchPipeline(
        {
          pipeline_id: pipeline['id'], 
          extra_data: input_obj,
          attach_to_job: true,
          delete_job_after_loading: true,
          after_submit: (()=>{this.setState({message: 'ocr+redact job submitted'})}),
        }
      )
    } else {
      const pipeline_obj = this.buildOcrRedactPipelineObject(ocr_rule, pipeline_name)
      this.savePipelineToDatabase(
        pipeline_obj,
        ((response) => {this.dispatchPipeline(
          {
            pipeline_id: response['pipeline_id'], 
            extra_data: input_obj, 
            attach_to_job: true,
            delete_job_after_loading: true,
            after_submit: (()=>{this.setState({message: 'ocr+redact job submitted'})}),
          }
        )})
      )
    }
  } 

  runTemplateRedactPipelineJob(template_id, scope='one_frame') {
    if (!Object.keys(this.state.tier_1_scanners['template']).includes(template_id)) {
      this.setState({
        message: 'no template found for the specified id'
      })
      return
    }
    let the_build_movie = {}
    if (scope === 'one_frame') {
      the_build_movie = this.buildMoviesForSingleFrame()
    } else if (scope === 'all') {
      the_build_movie = this.buildMoviesForAllFrames()
    }
    let input_obj = {
      movies: the_build_movie,
    }
    input_obj['redact_rule'] = this.state.redact_rule

    const pipeline_name = 'scan_template_and_redact_' + template_id.toString()
    const pipeline = this.getPipelineForName(pipeline_name)
    if (pipeline) {
      this.dispatchPipeline(
        {
          pipeline_id: pipeline['id'], 
          extra_data: input_obj,
          attach_to_job: true,
          delete_job_after_loading: true,
          after_submit: (()=>{this.setState({message: 'ocr+redact job submitted'})}),
        }
      )
    } else {
      const pipeline_obj = this.buildTemplateRedactPipelineObject(
        template_id, 
        pipeline_name
      )
      this.savePipelineToDatabase(
        pipeline_obj,
        ((response) => {this.dispatchPipeline(
          {
            pipeline_id: response['pipeline_id'], 
            extra_data: input_obj, 
            attach_to_job: true,
            delete_job_after_loading: true,
            after_submit: (()=>{this.setState({message: 'template+redact job submitted'})}),
          }
        )})
      )
    }
  }

  getPipelineForName(the_name) {
    return Pipelines.getPipelineForName(the_name, this.state.pipelines)
  }

  buildMoviesForSingleFrame() {
    const image_url = this.getImageUrl()
    const frameset_hash = this.getFramesetHashForImageUrl(image_url)
    let movies = {}
    movies[this.state.movie_url] = {
      framesets: {},
      frames: [],
    }
    movies[this.state.movie_url]['framesets'][frameset_hash] = {images: []}
    movies[this.state.movie_url]['framesets'][frameset_hash]['images'].push(image_url)
    movies[this.state.movie_url]['frames'].push(image_url)
    return movies
  }

  buildMoviesForAllFrames() {
    let movies = {}
    movies[this.state.movie_url] = this.state.movies[this.state.movie_url]
    return movies
  }

  clearCurrentIllustrations() {
    if (!this.state.movie_url || !this.state.movies) {
      return
    }
    let deepCopyMovies = JSON.parse(JSON.stringify(this.state.movies))
    let deepCopyMovie = JSON.parse(JSON.stringify(this.state.movies[this.state.movie_url]))

    for (let i=0; i < Object.keys(deepCopyMovie.framesets).length; i++) {
      const frameset_hash = Object.keys(deepCopyMovie.framesets)[i]
      if (Object.keys(deepCopyMovie.framesets[frameset_hash]).includes('illustrated_image')) {
        delete deepCopyMovie.framesets[frameset_hash].illustrated_image
      }
    }
    deepCopyMovies[this.state.movie_url] = deepCopyMovie
    this.setGlobalStateVar('movies', deepCopyMovies)
  }

  clearCurrentRedactions() {
    if (!this.state.movie_url || !this.state.movies) {
      return
    }
    let deepCopyMovies = JSON.parse(JSON.stringify(this.state.movies))
    let deepCopyMovie = JSON.parse(JSON.stringify(this.state.movies[this.state.movie_url]))

    for (let i=0; i < Object.keys(deepCopyMovie.framesets).length; i++) {
      const frameset_hash = Object.keys(deepCopyMovie.framesets)[i]
      if (Object.keys(deepCopyMovie.framesets[frameset_hash]).includes('redacted_image')) {
        delete deepCopyMovie.framesets[frameset_hash].redacted_image
      }
      if (Object.keys(deepCopyMovie.framesets[frameset_hash]).includes('areas_to_redact')) {
        delete deepCopyMovie.framesets[frameset_hash].areas_to_redact
      }
    }
    deepCopyMovies[this.state.movie_url] = deepCopyMovie
    this.setGlobalStateVar('movies', deepCopyMovies)
  }

  addWorkflowCallbacks(the_dict, when_done=(()=>{})) {
    let deepCopyWfCallbacks = JSON.parse(JSON.stringify(this.state.workflow_callbacks))
    for (let i=0; i < Object.keys(the_dict).length; i++) {
      const the_key = Object.keys(the_dict)[i]
      const the_func = the_dict[the_key]
      deepCopyWfCallbacks[the_key] = the_func
    }
    this.setGlobalStateVar('workflow_callbacks', deepCopyWfCallbacks, when_done)
  }

  setActiveWorkflow(active_workflow_name) {
    Workflows.setActiveWorkflow(
      active_workflow_name, 
      this.state.workflows, 
      this.state.workflow_callbacks, 
      this.setGlobalStateVar
    )
  }

  afterSaveWorkbookDone(workbook_id) {
    let cur_url = new URL(window.location.href)
    cur_url.searchParams.set('save-point', workbook_id)
    window.history.pushState({}, cur_url)
// DMC below is a hack to get save points working.  It's disruptive to the 
//   workflow for now, you get a big old screen flicker when you load any job,
//   The history approach above SHOULD work but needs tweaking I guess.
//    window.location = cur_url
  }

  saveStateCheckpoint() {
//    const the_name = 'workbook_autosave_' + Math.floor(Math.random(1000000, 9999999)*1000000000).toString()
//    this.saveWorkbook(this.afterSaveWorkbookDone, the_name, '1hours')
  }

  async queryCvWorker(cv_worker_url, when_done=(()=>{})) {
    let the_url = this.getUrl('link_proxy')
    await fetch(the_url, {
      method: 'POST',
      headers: this.buildJsonHeaders(),
      body: JSON.stringify({
        method: 'GET',
        url: cv_worker_url,
      }),
    })
    .then((response) => response.json())
    .then((responseJson) => {
      if (!Object.keys(responseJson).includes('response')) {
        this.setGlobalStateVar('message', 'unexpected response from cv worker')
        return
      }
      const operations = JSON.parse(responseJson['response'])
      let deepCopyCvWorkers = JSON.parse(JSON.stringify(this.state.cv_workers))
      let deepCopyCvWorker = deepCopyCvWorkers(cv_worker_url)
      deepCopyCvWorker['supported_operations'] = operations
      deepCopyCvWorkers[cv_worker_url] = deepCopyCvWorker
      this.setGlobalStateVar('cv_workers', deepCopyCvWorkers)
      when_done(responseJson)
    })
    .catch((error) => {
      console.error(error);
    })
  }

  impersonateUser(new_user_id) {
    let deepCopyUser = JSON.parse(JSON.stringify(this.state.user))
    deepCopyUser['id'] = new_user_id
    this.setGlobalStateVar('user', deepCopyUser)
  }

  async getAndSaveUser() {
    await this.getCurrentUser()
    .then((user_id) => {
      let user_object = {
        id: user_id,
      }
      this.setGlobalStateVar('user', user_object)
      return user_object
    })
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
      return api_server_url + 'v1/link/learn'
    } else if (url_name === 'link_proxy') {
      return api_server_url + 'v1/link/proxy'
    } else if (url_name === 'make_url_url') {
      return api_server_url + 'v1/files/make-url'
    } else if (url_name === 'scanners_url') {
      return api_server_url + 'v1/scanners'
    } else if (url_name === 'files_url') {
      return api_server_url + 'v1/files'
    } else if (url_name === 'pipelines_url') {
      return api_server_url + 'v1/pipelines'
    } else if (url_name === 'attributes_url') {
      return api_server_url + 'v1/attributes'
    } else if (url_name === 'version_url') {
      return api_server_url + 'v1/files/get-version'
    } else if (url_name === 'delete_old_jobs_url') {
      return api_server_url + 'v1/delete-old-jobs'
    } else if (url_name === 'delete_old_workbooks_url') {
      return api_server_url + 'v1/delete-old-workbooks'
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

  setGlobalStateVar(var_name, var_value='', when_done=(()=>{})) {
    if (typeof var_name === 'string' || var_name instanceof String) {
      // we have been given one key and one value
      if (this.state[var_name] === var_value) {
        when_done()
      } else {
        this.setState(
          {
            [var_name]: var_value,
          },
          when_done()
        )
      }
    } else {
      // var_name is actaully a dict
      this.setState(
        var_name, 
        when_done()
      )
    }
  }

  toggleGlobalStateVar(var_name) {
    const new_value = (!this.state[var_name])
    this.setState({
      [var_name]: new_value,
    })
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

  setFramesetHash(frameset_hash, framesets='', when_done=(()=>{})) {
    const the_url = this.getImageFromFrameset(frameset_hash, framesets)
    if (the_url === '') {
      this.setGlobalStateVar('frameset_hash', '')
      return
    }
    if (!this.state.movies) {
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
      when_done()
    }
    img.src = the_url
  }

  async getCurrentUser() {
    try {
      let build_user_id = ''
      if (!this.state.bypass_whoami) {
        await this.props.whoAmI.getUser()
        .then((user_id) => {
          build_user_id = user_id
        })
      }
      return build_user_id
    }
    catch(err) {
      console.log('gr abend while running whoAmI')
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
      return
    }
    let image_url = data_in['url']
    let deepCopyMovies= JSON.parse(JSON.stringify(this.state.movies))
    let movie_url = 'whatever'
    if (Object.keys(data_in).includes('movie_url')) {
      movie_url = data_in.movie_url
    }
    let deepCopyMovie = ''
    if (Object.keys(data_in).includes('movie')) {
      deepCopyMovie = data_in.movie
    } else {
      deepCopyMovie = JSON.parse(JSON.stringify(deepCopyMovies[movie_url]))
    }
    let new_hash = (Object.keys(deepCopyMovie['framesets']).length + 1).toString()
    if (deepCopyMovie['frames'].includes(image_url)) {
      const the_mess = 'error, trying to add image to move that already has it'
      this.setGlobalStateVar('message', the_mess)
      return
    } else {
      this.setGlobalStateVar('message', 'frame was successfullly added')
    }

    deepCopyMovie['frames'].push(image_url)
    deepCopyMovie['framesets'][new_hash] = {
      images: [image_url]
    }
    if (Object.keys(deepCopyMovie).includes('frameset_hashes_in_order')) {
      delete deepCopyMovie['frameset_hashes_in_order']
    }
    deepCopyMovies[movie_url] = deepCopyMovie
    this.setGlobalStateVar('movies', deepCopyMovies)
    if (Object.keys(data_in).includes('update_frameset_hash') && !data_in['update_frameset_hash']) {
      // only skip when explicitly requested
      console.assert(true)
    } else {
      this.setFramesetHash(new_hash)
    }
  }

  establishNewEmptyMovie(new_movie_url='whatever', make_active=true, when_done=(()=>{})) {
    this.setGlobalStateVar('movies', {})
    let new_movie = {
      frames: [],
      framesets: {},
    }
    let deepCopyMovies= JSON.parse(JSON.stringify(this.state.movies))
    deepCopyMovies[new_movie_url] = new_movie
    if (make_active) {
      this.setState(
        {
          movie_url: new_movie_url,
          movies: deepCopyMovies,
        },
        when_done()
      )
    } else {
      this.setState(
        {
          movies: deepCopyMovies,
        },
        when_done(new_movie)
      )
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
      return
    }
    this.handleSetMovieUrl(data_in['url'])
    // A hack, but for whatever reason the state isn't ready when the moviePanel renders

    /* pscottdv - read about React referances and then get rid of all calls to
                  getElementById() !
                  For example, if you do something like this in render():

                    <div ref={r => this.myDiv = r}>My Div</div>

                  Then in componentDidMount() and/or componentDidUpdate() you can
                  refer to the element directly:

                  componentDidUpdate() {
                    const myDivDimensions = this.myDiv.getBoundingClientRect();
                    ...
                  }

    */
    document.getElementById('image_panel_link').click()
    document.getElementById('movie_panel_link').click()
    this.addToCampaignMovies(data_in['url'])
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

  unwatchJob(job_id) {
    let deepCopyWJL= JSON.parse(JSON.stringify(this.state.whenJobLoaded))
    delete deepCopyWJL[job_id]
    this.setGlobalStateVar('whenJobLoaded', deepCopyWJL)
  }

  watchForJob(job_id, input_obj={}) {
    let after_loaded = (()=>{})
    if (Object.keys(input_obj).includes('after_loaded')) {
      after_loaded= input_obj.after_loaded
    }
    let deleteJob = false
    if (Object.keys(input_obj).includes('delete_job_after_loading')) {
      deleteJob = input_obj.delete_job_after_loading
    }

    let deepCopyWJL= JSON.parse(JSON.stringify(this.state.whenJobLoaded))
    deepCopyWJL[job_id] = {}
    deepCopyWJL[job_id]['after_loaded'] = after_loaded
    if (this.state.preserveAllJobs) {
      deepCopyWJL[job_id]['delete_job_after_loading'] = false
    } else {
      deepCopyWJL[job_id]['delete_job_after_loading'] = deleteJob
    }
    this.setGlobalStateVar('whenJobLoaded', deepCopyWJL)
  }

  isAttachedJob(job_id) {
    if (this.state.attached_job['id'] && this.state.attached_job['id'] === job_id) {
      return true
    }
  }

  getAttachedJobMessage(job) {
    if (
      this.state.attached_job['status'] === 'success' ||
      this.state.attached_job['status'] === 'failed'
    ) {
      return ''
    }
    if (this.state.attached_job['status'] === 'running' && job['status'] === 'failed') {
      return 'job has failed'
    }
    if (this.state.attached_job['status'] === 'running' && job['status'] === 'success') {
      return 'job has completed'
    }
    if (this.state.attached_job['status'] === 'running') {
      if (this.state.attached_job['percent_complete'] !== job['percent_complete']) {
        let et_number = job['percent_complete'].toString().substring(1, 4) * 100
        et_number = Math.floor(et_number)
        return et_number.toString() + ' percent complete'
      }
    } 
  }

  handleAttachedJobUpdate(job) {
    let deepCopyAJ = JSON.parse(JSON.stringify(this.state.attached_job))
    let aj_message_text = this.getAttachedJobMessage(job)
    deepCopyAJ['status'] = job['status']
    deepCopyAJ['percent_complete'] = job['percent_complete']
    this.setState({
      attached_job: deepCopyAJ,
      message: aj_message_text,
    })
  }

  async checkForJobs(user_id='') {
    if (!user_id) {
      user_id = this.state.user.id
    }

    let last_checked = new Date(1990, 1, 1, 12, 30, 0)
    const now = new Date()
    if (this.state.jobs_last_checked) {
      last_checked = this.state.jobs_last_checked
      const secs_since_last_check = (now - last_checked) / 1000
      if (secs_since_last_check < 2) {
        console.log('checking jobs too soon')
        return
      }
    }

    await this.getJobs(user_id)
    .then(() => {
      const jobIdsToCheckFor = Object.keys(this.state.whenJobLoaded)

      for (let index in this.state.jobs) {
        const job = this.state.jobs[index]
        // DMC this might not be needed any more.  When we get a signal
        // on the websocket, we handleAttachedJob there, maybe if we do that
        // we can skip it here.  Make sure all paths are handled that way
        if (this.isAttachedJob(job['id'])) {
          this.handleAttachedJobUpdate(job)
        }
        if (jobIdsToCheckFor.includes(job['id'])) {
          if (job['status'] === 'success') {
            this.loadJobResults(job['id'])
          }
        }
      }
      this.setGlobalStateVar('jobs_last_checked', now)
      if (this.props.poll_for_jobs) {
        setTimeout(this.checkForJobs, this.state.job_polling_interval_seconds * 1000);
      }
    })
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
        } 
      }
    } catch (e) {
      console.log('updateGlobalState crashed, probably bad json')
    }
  }

  async deleteAttachedJobAndForwardToWhenDoneTarget(the_url) {
    if (this.state.attached_job['id']) {
      await this.cancelJob(this.state.attached_job['id'])
      .then(() => {
          window.location.replace(the_url)
      })
    } else {
        window.location.replace(the_url)
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
    if (
      Object.keys(framesets).length > 3 ||
      Object.keys(framesets).length < 1
    ) {
      // TODO use the page messaging line for this eventually
      //   for now we do this from two pages, so this needs to be figured out
      alert('Learn requires up to three captured images, cannot submit')
      return
    }
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
        target_instance: this.state.whenDoneTarget,
      }),
    })
    .then((response) => response.json())
    .then((responseJson) => {
      if (Object.keys(responseJson).includes('learn_edit_url')) {
        this.deleteAttachedJobAndForwardToWhenDoneTarget(responseJson['learn_edit_url'])
      } else {
      // TODO use the page messaging line for this eventually
      //   for now we do this from two pages, so this needs to be figured out
        alert('no url in learn response, there must be a problem')
        return
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

  getFramesetHashesInOrder(movie=null) {
    if (!movie) {
      if (
        this.state.movies
        && this.state.movie_url
        && Object.keys(this.state.movies).includes(this.state.movie_url)
      ) {
        movie = this.state.movies[this.state.movie_url]
      } else{
        return []
      }
    }
    let return_arr = []
    for (let i=0; i < movie.frames.length; i++) {
      const frameset_hash = this.getFramesetHashForImageUrl(movie.frames[i], movie.framesets)
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

  setWorkbooks(the_workbooks) {
    Workbooks.setWorkbooks(the_workbooks, this.setGlobalStateVar)
  }

  keyPress(event) {
    if (event.ctrlKey && event.key === 'i') {
      document.getElementById('insights_link').click()
    }
  }

  async componentDidMount() {
    this.startWebSocket()
    this.deleteOldJobs()
    this.deleteOldWorkbooks()
    if (!this.state.showMovieParserLink) {
      document.getElementById('movie_panel_link').style.display = 'none'
    }
    if (!this.state.showInsightsLink) {
      document.getElementById('insights_link').style.display = 'none'
    }
    if (!this.state.showComposeLink) {
      document.getElementById('compose_link').style.display = 'none'
    }
    this.checkForInboundGetParameters()
    window.addEventListener('keydown', this.keyPress)
    await this.getAndSaveUser()
    .then(this.checkForJobs())
  }

  componentWillUnmount() {
    window.removeEventListener('keydown', this.keyPress)
  }

  startWebSocket() {
    if (this.props.poll_for_jobs) {
      return // we're doing polling instead of websockets
    }
    const protocol = global.location.protocol === "https:" ? "wss:" : "ws:"
    const hostname = global.location.hostname
    const port =
      ["127.0.0.1", "localhost"].includes(hostname) ? 8002 : global.location.port
    this.socket = new WebSocket(`${protocol}//${hostname}:${port}/ws/redact-jobs`)
    this.socket.onmessage = message => {
      const data = JSON.parse(message.data)
      if (data.percent_complete === 1) {
        this.checkForJobs()
      }
      if (this.isAttachedJob(data['job_id'])) {
        this.handleAttachedJobUpdate(data)
      }
    }
    this.socket.onopen = event  => {
    }
    this.socket.onclose = event  => {
      this.socket = null
    }
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
    let frameset_hash = ''
    let deepCopyMovies = movies
    if (
      movies[movie_url] &&
      movies[movie_url].frames &&
      movies[movie_url]['frames'].length > 0
    ) {
      deepCopyMovies = JSON.parse(JSON.stringify(movies))
      const hashes = this.getFramesetHashesInOrder(movies[movie_url])
      frameset_hash = hashes[0]
      deepCopyMovies[movie_url]['frameset_hashes_in_order'] = hashes
    } 
    this.setState({
      movie_url: movie_url, 
      movies: movies,
    },
      (() => {
        this.setFramesetHash(frameset_hash)
        theCallback(movies[movie_url])
      })
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
        let deepCopyFrameset = deepCopyMovies[movie_url]['framesets'][frameset_hash]
        if (!Object.keys(deepCopyFrameset).includes('areas_to_redact')) {
          deepCopyFrameset['areas_to_redact'] = []
        }
        for (let k=0; k < Object.keys(frameset).length; k++) {
          const anchor_id = Object.keys(frameset)[k]
          const match_obj = frameset[anchor_id]
          const area_to_redact = {
            start: match_obj['start'],
            end: match_obj['end'],
            source: 'template',
            id: anchor_id,
          }
          deepCopyFrameset['areas_to_redact'].push(area_to_redact)
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

  loadMoviesFromJob(job, use='results', when_done=(()=>{})) {
    let job_data = JSON.parse(job.response_data)
    if (use === 'request') {
      job_data = JSON.parse(job.request_data)
    }
    let deepCopyMovies = JSON.parse(JSON.stringify(this.state.movies))
    let movie_url = ''
    for (let i=0; i < Object.keys(job_data['movies']).length; i++) {
      movie_url = Object.keys(job_data['movies'])[i]
      if (!Object.keys(deepCopyMovies).includes(movie_url)) {
        deepCopyMovies[movie_url] = job_data['movies'][movie_url]
        deepCopyMovies[movie_url]['nickname'] = this.getMovieNicknameFromUrl(movie_url)
      }
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
      this.setGlobalStateVar({
        'movies': deepCopyMovies,
        'campaign_movies': new_campaign_movies,
      })
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

  async loadZipMovieResults(job, when_done=(()=>{})) {
    const response_data = JSON.parse(job.response_data)
    const the_url = response_data.movie_url
    this.setMovieRedactedUrl(the_url) 
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
      if ((job.app === 'analyze' && job.operation === 'scan_template_multi')
        || (job.app === 'analyze' && job.operation === 'scan_template_threaded')) {
        this.loadTemplateResults(job, when_done)
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
			} else if (job.app === 'analyze' && job.operation === 'selected_area_threaded') {
        this.loadSelectedAreaResults(job, when_done)
			} else if ((job.app === 'parse' && job.operation === 'split_and_hash_threaded')) {
        this.loadMoviesFromJob(job, 'results', when_done)
			} else if (job.app === 'pipeline'  && 
          job.operation === 'pipeline' && 
          job.description === 'top level job for pipeline fetch_split_hash_secure_file') {
        this.loadMoviesFromJob(job, 'results', when_done)
			} else if (job.app === 'pipeline'  && 
          job.operation === 'pipeline' && 
          job.description.indexOf('scan_template_and_redact') > -1) {
        this.loadRedactResults(job, when_done)
			} else if (job.app === 'pipeline'  && 
          job.operation === 'pipeline' && 
          job.description.indexOf('scan_ocr_and_redact') > -1) {
        this.loadRedactResults(job, when_done)
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
      }
      return responseJson
    })
    .then((responseJson) => {
      if (Object.keys(this.state.whenJobLoaded).includes(job_id)) {
        const after_loaded = this.state.whenJobLoaded[job_id]['after_loaded']
        if (after_loaded) {
          after_loaded()
        }
        const deleteJob = this.state.whenJobLoaded[job_id]['delete_job_after_loading']
        if (deleteJob) {
          this.cancelJob(job_id)
        }
        this.unwatchJob(job_id)
      }
      this.saveStateCheckpoint()
    })
    .catch((error) => {
      console.error(error);
    })
  }

  async getJobs(user_id='') {
    let the_url = this.getUrl('jobs_url')
    the_url += '?x=1'
    if (this.state.current_workbook_id) {
      the_url += '&workbook_id=' + this.state.current_workbook_id
    } 
    if (user_id) {
        the_url += '&user_id=' + user_id
    } else {
      if (this.state.user.id != null) {
        the_url += '&user_id=' + this.state.user['id']
      } 
    }
    // DMC a HACK until we get refactored
    the_url = this.getUrl('jobs_url')
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
    let job_percent_complete = ''
    for (let i=0; i < this.state.jobs.length; i++) {
      const job = this.state.jobs[i]
      if (job['id'] === job_id) {
        job_status = job['status']
        job_percent_complete = job['percent_complete']
      }
    }
    const attached_job = {
      id: job_id,
      status: job_status,
      percent_complete: job_percent_complete,
    }
    this.watchForJob(job_id)
    this.setGlobalStateVar('attached_job', attached_job)
  }

  async getPipelines() {
    Pipelines.getPipelines(
      fetch,
      this.getUrl,
      this.setGlobalStateVar,
      this.buildJsonHeaders
    )
  }

  async getAttributes() {
    let the_url = this.getUrl('attributes_url')
    the_url += '?name=file_dir_user'
    await fetch(the_url, {
      method: 'GET',
      headers: this.buildJsonHeaders(),
    })
    .then((response) => response.json())
    .then((responseJson) => {
      if (Object.keys(responseJson).includes('attributes')) {
        let there_were_changes = false
        let already_considered_dirs = []
        let deepCopyFiles= JSON.parse(JSON.stringify(this.state.files))
        for (let i=0; i < responseJson['attributes'].length; i++) {
          const attribute = responseJson['attributes'][i]

          const dirname_uuid = attribute['value'].split(':')[0]
          const username = attribute['value'].split(':')[1]
          if (already_considered_dirs.includes(dirname_uuid)) {
            continue
          }
          already_considered_dirs.push(dirname_uuid)
          for (let j=0; j < Object.keys(this.state.files['files']).length; j++) {
            const file_path = Object.keys(this.state.files['files'])[j]
            if (file_path.indexOf(dirname_uuid) > -1) {
              deepCopyFiles['files'][file_path]['owner'] = username
              there_were_changes = true
            } 
          }
        }
        if (there_were_changes) {
          this.setGlobalStateVar('files', deepCopyFiles)
        }

      }
    })
    .catch((error) => {
      console.error(error);
    })
  }

  async dispatchPipeline(input_obj) {
    let the_url = this.getUrl('pipelines_url') + '/dispatch'
    let build_movies = {}
    let specified_input = {}
    if (!input_obj.scope) {
      input_obj.scope = 'json_obj'
    }
    if (input_obj.scope === 'all_movies') {
      for (let i=0; i < this.state.campaign_movies.length; i++) {
        build_movies[this.state.campaign_movies[i]] = {}
      }
      specified_input['movies'] = build_movies
    } else if (input_obj.scope === 'current_movie') {
      build_movies[this.state.movie_url] = {}
      specified_input['movies'] = build_movies
    } else if (input_obj.scope === 'current_movie_as_frames') {
      build_movies[this.state.movie_url] = this.state.movies[this.state.movie_url]
      specified_input['movies'] = build_movies
    } else if (input_obj.scope === 'json_obj') {
      specified_input = input_obj.extra_data
    }
    let build_payload = {
      pipeline_id: input_obj.pipeline_id,
      input: specified_input,
      owner: this.state.user['id'],
    }
    if (Object.keys(input_obj.extra_data).includes['lifecycle_data']) {
      build_payload['lifecycle_data'] = input_obj.extra_data['lifecycle_data']
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
      this.watchForJob(responseJson['job_id'])
      this.getPipelines()
      if (input_obj.attach_to_job) {
        this.attachToJob(responseJson['job_id'])
      }
      if (
        Object.keys(input_obj).includes('after_loaded') ||
        Object.keys(input_obj).includes('delete_job_after_loading')
      ) {
        let al = (()=>{})
        if (Object.keys(input_obj).includes('after_loaded')) {
          al = input_obj.after_loaded
        }
        let djal = false
        if (Object.keys(input_obj).includes('delete_job_after_loading')) {
          djal = input_obj.delete_job_after_loading
        }
        this.watchForJob(
          responseJson['job_id'], 
          {
            'after_loaded': al,
            'delete_job_after_loading': djal,
          }
        )
      }
      if (input_obj.after_submit) {
        input_obj.after_submit(responseJson)
      }
      this.getJobs()
    })
    .catch((error) => {
      console.error(error);
    })
  }

  async deletePipeline(the_uuid, when_done=(()=>{})) {
    Pipelines.deletePipeline(
      the_uuid, 
      when_done, 
      this.getUrl,
      this.buildJsonHeaders,
      fetch,
      this.setGlobalStateVar
    )
  }

  async savePipelineToDatabase(pipeline_obj, when_done=(()=>{})) {
    Pipelines.savePipelineToDatabase(
      pipeline_obj,
      when_done,
      this.getUrl,
      this.buildJsonHeaders,
      fetch,
      this.setGlobalStateVar
    )
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
      this.getAttributes()
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

  getJobLifecycleData(job) {
    return {
      delete_files_with_job: true,
      auto_delete_age: '7days',
    }
  }

  getJobRoutingData(job) {
    for (let i=0; i < Object.keys(this.state.cv_workers).length; i++) {
      const worker_id = Object.keys(this.state.cv_workers)[i]
      const worker = this.state.cv_workers[worker_id]
      if (!Object.keys(worker).includes('supported_operations')) {
        continue
      }
      for (let j=0; j < Object.keys(worker['supported_operations']).length; j++) {
        const operation_name = Object.keys(worker['supported_operations'])[j]
        const operation = worker['supported_operations'][operation_name]
        if ( operation_name === job['operation'] && operation['status'] === 'ACTIVE') {
          return {
            'cv_worker_id': worker_id,
            'cv_worker_type': worker['type'],
          }
        }
      }
    }
  }

  async submitJob(hash_in) {
    let the_job_data = hash_in.hasOwnProperty('job_data')? hash_in['job_data'] : {}
    let when_submit_complete = hash_in.hasOwnProperty('after_submit')? hash_in['after_submit'] : (()=>{})
    let delete_job_after_loading = hash_in.hasOwnProperty('delete_job_after_loading')? hash_in['delete_job_after_loading'] : false
    let when_fetched = hash_in.hasOwnProperty('after_loaded')? hash_in['after_loaded'] : (()=>{})
    let when_failed = hash_in.hasOwnProperty('when_failed')? hash_in['when_failed'] : (()=>{})
    let enforce_lifecycle = hash_in.hasOwnProperty('enforce_lifecycle')? hash_in['enforce_lifecycle'] : false
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

    const routing_data = this.getJobRoutingData(build_obj)
    if (routing_data) {
      build_obj['routing_data'] = routing_data
    }

    if (enforce_lifecycle) {
      const lifecycle_data = this.getJobLifecycleData(build_obj)
      if (lifecycle_data) {
        build_obj['lifecycle_data'] = lifecycle_data
      }
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
      this.watchForJob(
        responseJson['job_id'], 
        {
          'after_loaded': when_fetched,
          'delete_job_after_loading': delete_job_after_loading,
        }
      )
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

  async deleteOldJobs() {
    let the_url = this.getUrl('delete_old_jobs_url')
    await fetch(the_url, {
      method: 'GET',
      headers: this.buildJsonHeaders(),
    })
    .catch((error) => {
      console.error(error);
    })
  }

  async deleteOldWorkbooks() {
    Workbooks.deleteOldWorkbooks(this.getUrl, fetch, this.buildJsonHeaders)
  }

  async getWorkbooks() {
    Workbooks.getWorkbooks(
      this.getUrl, 
      fetch, 
      this.buildJsonHeaders, 
      this.state.user['id'], 
      this.setGlobalStateVar
    )
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

  async saveWorkbook(when_done=(()=>{}), workbook_name='', auto_delete_age='') {
    Workbooks.saveWorkbook(
      when_done,
      workbook_name,
      auto_delete_age,
      this.state,
      this.state.current_workbook_name,
      this.state.user['id'],
      this.buildJsonHeaders,
      this.getUrl,
      fetch,
      this.setGlobalStateVar
    )
  }

  async loadWorkbook(workbook_id, when_done=(()=>{})) {
    Workbooks.loadWorkbook(
      workbook_id,
      when_done,
      this.setGlobalStateVar,
      fetch,
      this.getUrl,
      this.buildJsonHeaders,
      this.getJobs
    )
  }

  async deleteWorkbook(workbook_id, when_done=(()=>{})) {
    Workbooks.deleteWorkbook(
      workbook_id,
      when_done,
      this.getUrl,
      fetch,
      this.buildJsonHeaders,
      this.state.user['id']
    )
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

  async dispatchFetchSplitAndHash(
    recording_id, 
    use_lifecycle_data=false, 
    after_loaded=(()=>{})
  ) {
    if (!recording_id) {
      this.setGlobalStateVar('message', 'no recording id specified, not fetching')
      return
    }
    await this.getPipelines()
    .then(() => {
      const input_obj = {
        'recording_ids': [recording_id],
      }
      if (use_lifecycle_data) {
        const lifecycle_data = this.getJobLifecycleData({})
        input_obj['lifecycle_data'] = lifecycle_data
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
        const pipeline_obj = Pipelines.buildFetchSplitHashPipelineObject()
        this.savePipelineToDatabase(
          pipeline_obj,
          ((response) => {this.dispatchPipeline(
            {
              pipeline_id: response['pipeline_id'], 
              extra_data: input_obj, 
              attach_to_job: true,
              after_loaded: after_loaded,
              after_submit: (
                ()=>{this.setState({message: 'fetch split and hash job submitted'})}
              ),
            }
          )})
        )
        return
      } else {
        this.dispatchPipeline(
          {
            pipeline_id: fetch_split_pipeline_id, 
            extra_data: input_obj, 
            attach_to_job: true,
            after_loaded: after_loaded,
            after_submit: (
              ()=>{this.setState({message: 'fetch split and hash job submitted'})}
            ),
          }
        )
      }
    })
  }

  iAmWorkOrDev() {
    if (window.location.href.substring('step-work.dev.sykes.com') > -1 || 
        window.location.href.substring('step.dev.sykes.com') > -1) {
      return true
    }
    return false
  }

  checkForInboundGetParameters() {
    let vars = getUrlVars()
    if (Object.keys(vars).includes('when_done')) {
      this.saveWhenDoneInfo(vars['when_done'])
    } 
    if (Object.keys(vars).includes('workbook_id')) {
      this.loadWorkbook(vars['workbook_id'])
    } 
    if (Object.keys(vars).includes('save-point')) {
      this.loadWorkbook(vars['save-point'])
    } 
    if (Object.keys(vars).includes('recording-id')) {
      this.getAndSaveUser().then(() => {
        this.dispatchFetchSplitAndHash(vars['recording-id'], true) 
        if (this.iAmWorkOrDev()) {
          this.setGlobalStateVar('whenDoneTarget', 'learn_dev')
        } else {
          this.setGlobalStateVar('whenDoneTarget', 'learn_prod')
        }
      });
    }
    if (Object.keys(vars).includes('title') && Object.keys(vars).includes('subtitle')) {
      this.setState({
        breadcrumbs_title: vars['title'],
        breadcrumbs_subtitle: vars['subtitle'],
      })
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

  buildWorkflowButtonBar() {
    return Workflows.buildWorkflowButtonBar(
      this.state.workflows,
      this.state.workflow_callbacks,
      this.setGlobalStateVar
    )
  }

  buildWorkflowBottomNav() {
    return Workflows.buildWorkflowBottomNav(
      this.state.workflows,
      this.state.workflow_callbacks,
      this.setGlobalStateVar
    )
  }

  getBottomLinkStyle() {
    if (document.getElementById('nav_upper_wrapper')) {
      const rect = document.getElementById('nav_upper_wrapper').getBoundingClientRect()
      const rect_bottom = (rect.top + rect.height)
      const h = window.innerHeight
      const the_top = (h - rect_bottom - 30) + 'px'
      let navbar_collapse_style = {
        'color': 'white',
        'top': the_top,
        'textAlign': 'right',
      }
      return navbar_collapse_style
    }
  }

  buildNavBarCollapseButton() {
    const navbar_collapse_style = this.getBottomLinkStyle()

    let collapse_nav_words = 'Collapse Menu'
    let collapse_nav_link_words = '<<'
    let left_div_classname = 'col-4'
    let right_div_classname = 'col-8'
    if (this.state.sideNavIsCollapsed) {
      collapse_nav_words = 'Expand'
      collapse_nav_link_words = '>>'
      left_div_classname = 'col-1'
      right_div_classname = 'col-11'
    }
    return (
      <div 
        className='row'
      >
        <div className={left_div_classname} />
        <div className={right_div_classname}
        style={navbar_collapse_style}
        >
          <div className='d-inline'>
            <button
              className='btn text-light btn-link pt-1 pl-0'
              onClick={(()=>this.toggleGlobalStateVar('sideNavIsCollapsed'))}
            >
              {collapse_nav_words}
            </button>
          </div>
          <div className='d-inline'>
            <button
              className='btn text-light btn-link pt-1 pr-0 pl-0'
              onClick={(()=>this.toggleGlobalStateVar('sideNavIsCollapsed'))}
            >
              {collapse_nav_link_words}
            </button>
          </div>
        </div>
      </div>
    )
  }

  buildSideNav() {
    const navbar_collapse_button = this.buildNavBarCollapseButton()
    let navbar_style = {
      'paddingBottom': '100%',
      'marginBotton': '-100%',
    }
    let pl_name = 'Precision Learning'
    let mr_name = 'Movie Redaction'
    let insights_name = 'Insights'
    let top_div_classnames = 'h-100 col-2 bg-dark navbar-dark pl-4 font-weight-bold'
    if (this.state.sideNavIsCollapsed) {
      pl_name = 'PL'
      mr_name = 'MR'
      insights_name = 'In'
      top_div_classnames = 'h-100 col-1 bg-dark navbar-dark pl-2 font-weight-bold'
    }
    if (!this.props.show_insights) {
      insights_name = ''
    }
    if (this.props.hide_precision_learning) {
      pl_name = ''
    }
    return (
      <div 
        className={top_div_classnames}
        style={navbar_style}
      >
        <div id='nav_upper_wrapper'>
          <ul className="nav navbar-nav flex-column">
            <li className="nav-item mt-2 mb-2">
              <Link 
                className='nav-link' 
                id='compose_link' 
                to='/redact/compose'
              >
                {pl_name}
              </Link>
            </li>
            <li className="nav-item mt-2 mb-2">
              <Link 
                className='nav-link' 
                id='movie_panel_link' 
                to='/redact/movie'
              >
                {mr_name}
              </Link>
            </li>
            <li className="nav-item mt-2 mb-2">
              <Link 
                className='nav-link' 
                id='insights_link' 
                to='/redact/insights'
              >
                {insights_name}
              </Link>
            </li>
          </ul>
        </div>
        {navbar_collapse_button}
      </div>
    )
  }

  render() {
    const button_bar = this.buildWorkflowButtonBar()
    if (document.getElementById('movie_panel_link') && this.state.showMovieParserLink) {
      document.getElementById('movie_panel_link').style.display = 'block'
    }
    const side_nav = this.buildSideNav()
    return (
      <div className='container-fluid'>
      <div className='row'>

        {side_nav}

        <div className='col'>
          <div className='row'>
            <div className='col-11'>
              <div className='ml-5 mt-2'>
              {button_bar}
              </div>
            </div>
            <div className='col-1'>
              <JobBug
                jobs={this.state.jobs}
                attached_job={this.state.attached_job}
              />
            </div>
          </div>
          <div className='row'>
          <Switch>
            <Route path='/redact/movie'>
              <MoviePanel 
                setGlobalStateVar={this.setGlobalStateVar}
                toggleGlobalStateVar={this.toggleGlobalStateVar}
                movie_url = {this.state.movie_url}
                getCurrentFramesets={this.getCurrentFramesets}
                getCurrentFrames={this.getCurrentFrames}
                redact_rule={this.state.redact_rule}
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
                tier_1_scanners={this.state.tier_1_scanners}
                tier_1_scanner_current_ids={this.state.tier_1_scanner_current_ids}
                getFramesetHashesInOrder={this.getFramesetHashesInOrder}
                getJobs={this.getJobs}
                submitJob={this.submitJob}
                jobs={this.state.jobs}
                postMakeUrlCall={this.postMakeUrlCall}
                establishNewMovie={this.establishNewMovie}
                preserve_movie_audio={this.state.preserve_movie_audio}
                message={this.state.message}
                setActiveWorkflow={this.setActiveWorkflow}
                image_width={this.state.image_width}
                image_height={this.state.image_height}
                image_scale={this.state.image_scale}
                getImageUrl={this.getImageUrl}
                active_frameset_hash={this.state.frameset_hash}
                clearCurrentFramesetChanges={this.clearCurrentFramesetChanges}
                runTemplateRedactPipelineJob={this.runTemplateRedactPipelineJob}
                runOcrRedactPipelineJob={this.runOcrRedactPipelineJob}
                cropImage={this.cropImage}
                dispatchFetchSplitAndHash={this.dispatchFetchSplitAndHash}
                toggleShowVisibility={this.toggleShowVisibility}
                visibilityFlags={this.state.visibilityFlags}
              />
            </Route>
            <Route path='/redact/insights'>
              <InsightsPanel  
                setGlobalStateVar={this.setGlobalStateVar}
                toggleGlobalStateVar={this.toggleGlobalStateVar}
                getFramesetHashesInOrder={this.getFramesetHashesInOrder}
                handleSetMovieUrl={this.handleSetMovieUrl}
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
                loadWorkbook={this.loadWorkbook}
                deleteWorkbook={this.deleteWorkbook}
                workbooks={this.state.workbooks}
                current_workbook_name={this.state.current_workbook_name}
                current_workbook_id={this.state.current_workbook_id}
                setSelectedAreaMetas={this.setSelectedAreaMetas}
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
                redact_rule={this.state.redact_rule}
                visibilityFlags={this.state.visibilityFlags}
                toggleShowVisibility={this.toggleShowVisibility}
                impersonateUser={this.impersonateUser}
                attached_job={this.state.attached_job}
                message={this.state.message}
                user={this.state.user}
                cv_workers={this.state.cv_workers}
                queryCvWorker={this.queryCvWorker}
                dispatchFetchSplitAndHash={this.dispatchFetchSplitAndHash}
                deleteOldJobs={this.deleteOldJobs}
                setActiveWorkflow={this.setActiveWorkflow}
                job_polling_interval_seconds={this.state.job_polling_interval_seconds}
              />
            </Route>
            <Route path={['/redact/compose', '/redact']}>
              <ComposePanel 
                setGlobalStateVar={this.setGlobalStateVar}
                movies={this.state.movies}
                establishNewEmptyMovie={this.establishNewEmptyMovie}
                addImageToMovie={this.addImageToMovie}
                movie_url = {this.state.movie_url}
                workflows = {this.state.workflows}
                getCurrentFrames={this.getCurrentFrames}
                getCurrentFramesets={this.getCurrentFramesets}
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
                attachToJob={this.attachToJob}
                attached_job={this.state.attached_job}
                message={this.state.message}
                getPipelines={this.getPipelines}
                dispatchFetchSplitAndHash={this.dispatchFetchSplitAndHash}
                breadcrumbs_title={this.state.breadcrumbs_title}
                breadcrumbs_subtitle={this.state.breadcrumbs_subtitle}
                setActiveWorkflow={this.setActiveWorkflow}
                templates={this.state.tier_1_scanners['template']}
                workflow_callbacks={this.state.workflow_callbacks}
                addWorkflowCallbacks={this.addWorkflowCallbacks}
                clearCurrentFramesetChanges={this.clearCurrentFramesetChanges}
                redact_rule={this.state.redact_rule}
                cropImage={this.cropImage}
                tier_1_scanners={this.state.tier_1_scanners}
                tier_1_scanner_current_ids={this.state.tier_1_scanner_current_ids}
                illustrateParameters={this.state.illustrateParameters}
                setIllustrateParameters={this.setIllustrateParameters}
                clearCurrentIllustrations={this.clearCurrentIllustrations}
                clearCurrentRedactions={this.clearCurrentRedactions}
                pipelines={this.state.pipelines}
                savePipelineToDatabase={this.savePipelineToDatabase}
                active_frameset_hash={this.state.frameset_hash}
                image_width={this.state.image_width}
                image_height={this.state.image_height}
                image_scale={this.state.image_scale}
                buildMoviesForSingleFrame={this.buildMoviesForSingleFrame}
                runTemplateRedactPipelineJob={this.runTemplateRedactPipelineJob}
                runOcrRedactPipelineJob={this.runOcrRedactPipelineJob}
                buildWorkflowBottomNav={this.buildWorkflowBottomNav}
              />
            </Route>
          </Switch>
          </div>
        </div>
      </div>
      </div>
    );
  }
}

export default RedactApplication;
