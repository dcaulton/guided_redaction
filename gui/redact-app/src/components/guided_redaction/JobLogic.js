import React from 'react';

class JobLogic extends React.Component {

  static unwatchJob(job_id, whenJobLoaded, setGlobalStateVar) {
    let deepCopyWJL= whenJobLoaded
    delete deepCopyWJL[job_id]
    setGlobalStateVar('whenJobLoaded', deepCopyWJL)
  }

  static attachToJob(job_id, whenJobLoaded, preserveAllJobs, setGlobalStateVar, jobs) {
    let job_status = ''
    let job_percent_complete = ''
    for (let i=0; i < jobs.length; i++) {
      const job = jobs[i]
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
    this.watchForJob(job_id, {}, whenJobLoaded, preserveAllJobs, setGlobalStateVar)
    setGlobalStateVar('attached_job', attached_job)
  }

  static getJobRoutingData(job, cv_workers) {
    for (let i=0; i < Object.keys(cv_workers).length; i++) {
      const worker_id = Object.keys(cv_workers)[i]
      const worker = cv_workers[worker_id]
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

  static async cancelJob(job_id, getUrl, fetch_func, buildJsonHeaders, getJobs) {
    let the_url = getUrl('jobs_url') + '/' + job_id
    await fetch_func(the_url, {
      method: 'DELETE',
      headers: buildJsonHeaders(),
    })
    .then(() => {
      getJobs()
    })
    .catch((error) => {
      console.error(error);
    })
  }

  static async deleteOldJobs(getUrl, fetch_func, buildJsonHeaders) {
    let the_url = getUrl('delete_old_jobs_url')
    await fetch_func(the_url, {
      method: 'GET',
      headers: buildJsonHeaders(),
    })
    .catch((error) => {
      console.error(error);
    })
  }

  static getMovieNicknameFromUrl(the_url) {
    let url_parts = the_url.split('/')
    let name_parts = url_parts[url_parts.length-1].split('.')
    let file_name_before_dot = name_parts[name_parts.length-2]
    return file_name_before_dot
  }

  static setMovieRedactedUrl(the_url, setGlobalStateVar, getGlobalStateVar) {
    const movies = getGlobalStateVar('movies')
    const movie_url = getGlobalStateVar('movie_url')
    let deepCopyMovies = JSON.parse(JSON.stringify(movies))
    let existing_movie = deepCopyMovies[movie_url]
    if (existing_movie) {
      existing_movie['redacted_movie_url'] = the_url
      deepCopyMovies[movie_url] = existing_movie
      setGlobalStateVar('movies', deepCopyMovies)
    }
  }

  static watchForJob(job_id, input_obj={}, whenJobLoaded, preserveAllJobs, setGlobalStateVar) {
    let after_loaded = (()=>{})
    if (Object.keys(input_obj).includes('after_loaded')) {
      after_loaded= input_obj.after_loaded
    }
    let deleteJob = false
    if (Object.keys(input_obj).includes('delete_job_after_loading')) {
      deleteJob = input_obj.delete_job_after_loading
    }

    let deepCopyWJL= whenJobLoaded
    deepCopyWJL[job_id] = {}
    deepCopyWJL[job_id]['after_loaded'] = after_loaded
    if (preserveAllJobs) {
      deepCopyWJL[job_id]['delete_job_after_loading'] = false
    } else {
      deepCopyWJL[job_id]['delete_job_after_loading'] = deleteJob
    }
    setGlobalStateVar('whenJobLoaded', deepCopyWJL)
  }

  static isAttachedJob(job_id, attached_job) {
    if (attached_job['id'] && attached_job['id'] === job_id) {
      return true
    }
  }

  static getAttachedJobMessage(job, attached_job) {
    if (
      attached_job['status'] === 'success' ||
      attached_job['status'] === 'failed'
    ) {
      return ''
    }
    if (attached_job['status'] === 'running' && job['status'] === 'failed') {
      return 'job has failed'
    }
    if (attached_job['status'] === 'running' && job['status'] === 'success') {
      return 'job has completed'
    }
    if (attached_job['status'] === 'running') {
      if (attached_job['percent_complete'] !== job['percent_complete']) {
        let et_number = job['percent_complete'].toString().substring(1, 4) * 100
        et_number = Math.floor(et_number)
        return et_number.toString() + ' percent complete'
      }
    } 
  }

  static handleAttachedJobUpdate(job, attached_job, setGlobalStateVar) {
    let deepCopyAJ = JSON.parse(JSON.stringify(attached_job))
    let aj_message_text = this.getAttachedJobMessage(job, attached_job)
    deepCopyAJ['status'] = job['status']
    deepCopyAJ['percent_complete'] = job['percent_complete']
    setGlobalStateVar({
      attached_job: deepCopyAJ,
      message: aj_message_text,
    })
  }

  static async checkForJobs(pass_obj) {
    let setGlobalStateVar = pass_obj['setGlobalStateVar']
    let getGlobalStateVar = pass_obj['getGlobalStateVar']
    let user_id = getGlobalStateVar('user')['id']
    let jobs_last_checked = getGlobalStateVar('jobs_last_checked')
    let whenJobLoaded = getGlobalStateVar('whenJobLoaded')
    let poll_for_jobs = pass_obj['poll_for_jobs']
    let job_polling_interval_seconds = getGlobalStateVar('job_polling_interval_seconds')
    let getJobs = pass_obj['getJobs']
    let addMovieAndSetActive = pass_obj['addMovieAndSetActive']
    let getUrl = pass_obj['getUrl']
    let fetch_func = pass_obj['fetch_func']
    let buildJsonHeaders = pass_obj['buildJsonHeaders']
    let saveStateCheckpoint = pass_obj['saveStateCheckpoint']

    let last_checked = new Date(1990, 1, 1, 12, 30, 0)
    const now = new Date()
    if (jobs_last_checked) {
      last_checked = jobs_last_checked
      const secs_since_last_check = (now - last_checked) / 1000
      if (secs_since_last_check < 2) {
        console.log('checking jobs too soon')
        return
      }
    }

    await getJobs(user_id)
    .then(() => {
      let jobs = getGlobalStateVar('jobs')
      const jobIdsToCheckFor = Object.keys(whenJobLoaded)
      for (let index in jobs) {
        const job = jobs[index]
        // we only need this for non-websocket systems.  When we get a signal
        // on the websocket, we handleAttachedJobUpdate there.
        let attached_job = getGlobalStateVar('attached_job')
        if (this.isAttachedJob(job['id'], attached_job)) {
          this.handleAttachedJobUpdate(job, attached_job, setGlobalStateVar)
        }
        if (jobIdsToCheckFor.includes(job['id'])) {
          if (job['status'] === 'success') {
            this.loadJobResults(
              job['id'],
              (()=>{}), 
              whenJobLoaded, 
              setGlobalStateVar,
              getGlobalStateVar,
              addMovieAndSetActive,
              getUrl,
              fetch_func,
              buildJsonHeaders,
              getJobs,
              saveStateCheckpoint
            )
          }
        }
      }
      setGlobalStateVar('jobs_last_checked', now)
      if (poll_for_jobs) {
        setTimeout(this.checkForJobs.bind(this), job_polling_interval_seconds * 1000, pass_obj)
      }
    })
  }

  static loadTier1ScannersFromTier1Request(
    scanner_type, 
    request_data, 
    tier_1_scanners, 
    current_ids, 
    setGlobalStateVar, 
    getGlobalStateVar, 
    force_add=false
  ) {
    let scanner_id = ''
    let something_changed = false
    let deepCopyScanners = JSON.parse(JSON.stringify(tier_1_scanners))
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
      let deepCopyIds = JSON.parse(JSON.stringify(current_ids))
      deepCopyIds['t1_scanner'][scanner_type] = scanner_id
      setGlobalStateVar({
        tier_1_scanners: deepCopyScanners,
        current_ids: deepCopyIds,
      })
    }
  }

  static addToCampaignMovies(movie_url, setGlobalStateVar, getGlobalStateVar) {
    const campaign_movies = getGlobalStateVar('campaign_movies')
    if (!campaign_movies.includes(movie_url)) {
      let deepCopyCampaignMovies= JSON.parse(JSON.stringify(campaign_movies))
      deepCopyCampaignMovies.push(movie_url)
      setGlobalStateVar('campaign_movies', deepCopyCampaignMovies)
    }
  }

  static loadMoviesFromTier1Source(
    request_data, 
    setGlobalStateVar, 
    getGlobalStateVar
  ) {
    const movies = getGlobalStateVar('movies')
    let campaign_movies = getGlobalStateVar('campaign_movies')
    let movie_url = ''
    let deepCopyMovies= JSON.parse(JSON.stringify(movies))
    let something_changed = false
    if (!Object.keys(request_data['movies']).includes('source')) {
      return 
    }
    for (let i=0; i < Object.keys(request_data['movies']['source']).length; i++) {
      movie_url = Object.keys(request_data['movies']['source'])[i]
      if (!Object.keys(deepCopyMovies).includes(movie_url)) {
        deepCopyMovies[movie_url] = request_data['movies']['source'][movie_url]
        this.addToCampaignMovies(movie_url, setGlobalStateVar, getGlobalStateVar)
        something_changed = true
      }
      if (!campaign_movies.includes(movie_url)) {
        campaign_movies.push(movie_url)
      }
    }
    if (something_changed) {
      setGlobalStateVar({
        campaign_movies: campaign_movies,
        movies: deepCopyMovies,
        movie_url: movie_url,
      })
    }
    return {
      movie_url: movie_url,
    }
  }

  static loadMoviesFromTier1Request(
    request_data, 
    setGlobalStateVar, 
    getGlobalStateVar
  ) {
    const movies = getGlobalStateVar('movies')
    let campaign_movies = getGlobalStateVar('campaign_movies')
    let movie_url = ''
    let deepCopyMovies= JSON.parse(JSON.stringify(movies))
    let something_changed = false
    let active_movie_url = ''
    for (let i=0; i < Object.keys(request_data['movies']).length; i++) {
      if (Object.keys(request_data['movies'])[i] === 'source') {
        continue
      }
      movie_url = Object.keys(request_data['movies'])[i]
      if (!Object.keys(deepCopyMovies).includes(movie_url)) {
        if (!active_movie_url) {
          active_movie_url = movie_url
        }
        if ((Object.keys(request_data['movies']).includes('source')) &&
            (Object.keys(request_data['movies']['source']).includes(movie_url))) {
            deepCopyMovies[movie_url] = request_data['movies']['source'][movie_url]
        } else {
            deepCopyMovies[movie_url] = request_data['movies'][movie_url]
        }
        this.addToCampaignMovies(movie_url, setGlobalStateVar, getGlobalStateVar)
        something_changed = true
      }
      if (!campaign_movies.includes(movie_url)) {
        campaign_movies.push(movie_url)
      }
    }
    if (something_changed && request_data['scan_level'] === 'tier_1') {
      setGlobalStateVar({
        campaign_movies: campaign_movies,
        movies: deepCopyMovies,
        movie_url: active_movie_url,
      })
    }
    return {
      movie_url: active_movie_url,
    }
  }

  static async loadOcrResults(
    job, 
    when_done=(()=>{}), 
    setGlobalStateVar, 
    getGlobalStateVar
  ) {
    let resp_obj = this.loadScannersMoviesAndMatchesFromTier1(
      job, 
      'ocr', 
      setGlobalStateVar, 
      getGlobalStateVar
    )
    const request_data = JSON.parse(job.request_data)
    if (request_data['scan_level'] === 'tier_2') {
      this.loadTier2RedactData(job, request_data, resp_obj, setGlobalStateVar)
    } 
    when_done()
  }

  loadTier2RedactData(job, request_data, resp_obj, setGlobalStateVar) {
    const response_data = JSON.parse(job.response_data)

    const movie_url = resp_obj['movie_url']
    let deepCopyMovies = resp_obj['deepCopyMovies']

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
      setGlobalStateVar({
        movies: deepCopyMovies,
        movie_url: movie_url,
      })
    }

  }

  static loadTemplateResults(
    job, 
    when_done=(()=>{}), 
    setGlobalStateVar, 
    getGlobalStateVar, 
  ) {
    let resp_obj = this.loadScannersMoviesAndMatchesFromTier1(
      job, 
      'template', 
      setGlobalStateVar, 
      getGlobalStateVar
    )

    const request_data = JSON.parse(job.request_data)
    if (request_data['scan_level'] === 'tier_2') {
      this.loadTier2RedactData(job, request_data, resp_obj, setGlobalStateVar)
    } 
  }

  static loadScannersMoviesAndMatchesFromTier1(
    job, 
    scanner_type, 
    setGlobalStateVar, 
    getGlobalStateVar
  ) {
    let response_data = JSON.parse(job.response_data)
    response_data['job_id'] = job.id
    const tier_1_scanners = getGlobalStateVar('tier_1_scanners')
    const current_ids = getGlobalStateVar('current_ids')
    const tier_1_matches = getGlobalStateVar('tier_1_matches')
    if (!response_data) {
      return
    }
    let request_data = JSON.parse(job.request_data)
    if (!Object.keys(response_data).includes('movies')) {
      return
    }

    this.loadTier1ScannersFromTier1Request(
      scanner_type, 
      request_data, 
      tier_1_scanners, 
      current_ids, 
      setGlobalStateVar,
      getGlobalStateVar
    )

    let resp_obj = this.loadMoviesFromTier1Request(
      request_data, 
      setGlobalStateVar,
      getGlobalStateVar
    )

    if (request_data['scan_level'] === 'tier_1') {
      let deepCopyTier1Matches = JSON.parse(JSON.stringify(tier_1_matches))
      let deepCopyMatches = deepCopyTier1Matches[scanner_type]
      deepCopyMatches[request_data['id']] = response_data
      deepCopyTier1Matches[scanner_type] = deepCopyMatches // todo: can we remove this?
      setGlobalStateVar('tier_1_matches', deepCopyTier1Matches)
      return resp_obj
    }
  }

  static loadDataSifterResults(
    job, 
    when_done, 
    setGlobalStateVar, 
    getGlobalStateVar
  ) {
    this.loadScannersMoviesAndMatchesFromTier1(
      job, 
      'data_sifter', 
      setGlobalStateVar, 
      getGlobalStateVar
    )
  } 

  static loadT1FilterResults(
    job, 
    when_done, 
    setGlobalStateVar, 
    getGlobalStateVar
  ) {
    this.loadScannersMoviesAndMatchesFromTier1(
      job, 
      't1_filter', 
      setGlobalStateVar, 
      getGlobalStateVar
    )
  } 

  static loadFocusFinderResults(
    job, 
    when_done, 
    setGlobalStateVar, 
    getGlobalStateVar
  ) {
    this.loadScannersMoviesAndMatchesFromTier1(
      job, 
      'focus_finder', 
      setGlobalStateVar, 
      getGlobalStateVar
    )
  } 

  static loadMeshMatchResults(
    job, 
    when_done, 
    setGlobalStateVar, 
    getGlobalStateVar
  ) {
    this.loadScannersMoviesAndMatchesFromTier1(
      job, 
      'mesh_match',
      setGlobalStateVar, 
      getGlobalStateVar
    )
  }

  static loadSelectionGrowerResults(
    job, 
    when_done, 
    setGlobalStateVar, 
    getGlobalStateVar
  ) {
    this.loadScannersMoviesAndMatchesFromTier1(
      job, 
      'selection_grower',
      setGlobalStateVar, 
      getGlobalStateVar
    )
  }

  static loadPseudoTier1Results(
    job, 
    when_done, 
    setGlobalStateVar, 
    getGlobalStateVar
  ) {
    const request_data = JSON.parse(job.request_data)
    let response_data = JSON.parse(job.response_data)
    response_data['job_id'] = job.id

    const movies = getGlobalStateVar('movies')
    let campaign_movies = getGlobalStateVar('campaign_movies')
    let movie_url = ''
    let deepCopyMovies= JSON.parse(JSON.stringify(movies))
    let something_changed = false
    if (Object.keys(request_data).includes('movies')) {
      if (Object.keys(request_data['movies']).includes('source')) {
        for (let i=0; i < Object.keys(request_data['movies']['source']).length; i++) {
          movie_url = Object.keys(request_data['movies']['source'])[i]
          if (Object.keys(deepCopyMovies).includes(movie_url)) {
            continue
          }
          something_changed = true
          campaign_movies.push(movie_url)
          deepCopyMovies[movie_url] = request_data['movies']['source'][movie_url]
        }
      } else {
        for (let i=0; i < Object.keys(request_data['movies']).length; i++) {
          const movie_url = Object.keys(request_data['movies'])[i]
          const movie = request_data['movies'][movie_url]
          if (Object.keys(deepCopyMovies).includes(movie_url)) {
            continue
          }
          if (Object.keys(movie).includes('frames') && movie['frames'].length > 0) {
            deepCopyMovies[movie_url] = movie
            something_changed = true
            campaign_movies.push(movie_url)
          }
        }
      }
      if (something_changed) {
        setGlobalStateVar({
          campaign_movies: campaign_movies,
          movies: deepCopyMovies,
          movie_url: movie_url,
        })
      }
    }

    const t1s_cids = getGlobalStateVar('current_ids')
    let deepCopyT1SCIDs = JSON.parse(JSON.stringify(t1s_cids))
    deepCopyT1SCIDs['t1_scanner'][job.operation] = job['id']

    const tier_1_matches = getGlobalStateVar('tier_1_matches')
    let deepCopyTier1Matches = JSON.parse(JSON.stringify(tier_1_matches))
    let deepCopyMatches = deepCopyTier1Matches[job.operation]
    deepCopyMatches[job['id']] = response_data
    deepCopyTier1Matches[job.operation] = deepCopyMatches
    setGlobalStateVar({
      'tier_1_matches': deepCopyTier1Matches,
      'current_ids': deepCopyT1SCIDs,
    })
    when_done(job)
  }

  static loadSelectedAreaResults(
    job, 
    when_done, 
    setGlobalStateVar, 
    getGlobalStateVar
  ) {
    let resp_obj = this.loadScannersMoviesAndMatchesFromTier1(
      job, 
      'selected_area',
      setGlobalStateVar, 
      getGlobalStateVar
    )

    const request_data = JSON.parse(job.request_data)
    if (request_data['scan_level'] === 'tier_2') {
      this.loadTier2RedactData(job, request_data, resp_obj, setGlobalStateVar)
    } 
  }

  static loadMoviesFromJob(job, when_done=(()=>{}), addMovieAndSetActive, getGlobalStateVar) {
    let job_data = JSON.parse(job.response_data)
    const movies = getGlobalStateVar('movies')
    let deepCopyMovies = JSON.parse(JSON.stringify(movies))
    let active_movie_url = ''
    let movie_url = ''
    for (let i=0; i < Object.keys(job_data['movies']).length; i++) {
      movie_url = Object.keys(job_data['movies'])[i]
      if (!active_movie_url) {
        active_movie_url = movie_url
      }
      if (!Object.keys(deepCopyMovies).includes(movie_url)) {
        deepCopyMovies[movie_url] = job_data['movies'][movie_url]
        deepCopyMovies[movie_url]['nickname'] = this.getMovieNicknameFromUrl(movie_url)
      }
    }
    addMovieAndSetActive(
      active_movie_url,
      deepCopyMovies,
      when_done,
    )
  }

  static loadSplitResults(job, when_done=(()=>{}), addMovieAndSetActive, getGlobalStateVar) {
    const response_data = JSON.parse(job.response_data)
    const movies = getGlobalStateVar('movies')
    const request_data = JSON.parse(job.request_data)
    let deepCopyMovies = JSON.parse(JSON.stringify(movies))
    const movie_url = request_data['movie_url']
    deepCopyMovies[movie_url] = response_data['movies'][movie_url]
    deepCopyMovies[movie_url]['nickname'] = this.getMovieNicknameFromUrl(movie_url)
    addMovieAndSetActive(
      movie_url,
      deepCopyMovies,
      when_done,
    )
  }

  static loadHashResults(job, when_done=(()=>{}), addMovieAndSetActive, getGlobalStateVar) {
    const response_data = JSON.parse(job.response_data)
    const movies = getGlobalStateVar('movies')
    const request_data = JSON.parse(job.request_data)
    let deepCopyMovies = JSON.parse(JSON.stringify(movies))
    const movie_url = Object.keys(request_data['movies'])[0]
    if (!Object.keys(this.state.movies).includes(movie_url)) {
      deepCopyMovies[movie_url] = request_data['movies'][movie_url]
    }
    const framesets = response_data['movies'][movie_url]['framesets']
    deepCopyMovies[movie_url]['framesets'] = framesets
    addMovieAndSetActive(
      movie_url,
      deepCopyMovies,
      when_done,
    )
  }

  static loadCopyResults(job, when_done=(()=>{}), addMovieAndSetActive, getGlobalStateVar) {
    const response_data = JSON.parse(job.response_data)
    const movies = getGlobalStateVar('movies')
    let deepCopyMovies = JSON.parse(JSON.stringify(movies))
    const movie_url = Object.keys(response_data['movies'])[0]
    if (!Object.keys(this.state.movies).includes(movie_url)) {
      deepCopyMovies[movie_url] = response_data['movies'][movie_url]
    }
    addMovieAndSetActive(
      movie_url,
      deepCopyMovies,
      when_done,
    )
  }

  static loadChangeResolutionResults(job, when_done=(()=>{}), addMovieAndSetActive, getGlobalStateVar) {
    const response_data = JSON.parse(job.response_data) 
    const movies = getGlobalStateVar('movies')
    let deepCopyMovies = JSON.parse(JSON.stringify(movies))
    const movie_url = Object.keys(response_data['movies'])[0]
    deepCopyMovies[movie_url] = response_data['movies'][movie_url]
    addMovieAndSetActive(
      movie_url,
      deepCopyMovies,
      when_done,
    )
  }

  static loadRenderSubsequenceResults(job, when_done=(()=>{}), setGlobalStateVar, getGlobalStateVar) {
    const response_data = JSON.parse(job.response_data)
    const subsequences = getGlobalStateVar('subsequences')
    let deepCopySubsequences = JSON.parse(JSON.stringify(subsequences))
    const subsequence_id = response_data['subsequence']['id']
    deepCopySubsequences[subsequence_id] = response_data['subsequence']
    setGlobalStateVar('subsequences', deepCopySubsequences)
  }

  static loadRebaseMoviesResults(
    job, 
    when_done, 
    setGlobalStateVar, 
    getGlobalStateVar, 
    addMovieAndSetActive
  ) {
    const response_data = JSON.parse(job.response_data)
    const movies = getGlobalStateVar('movies')
    const campaign_movies = getGlobalStateVar('campaign_movies')
    let deepCopyMovies = JSON.parse(JSON.stringify(movies))
    let new_campaign_movies = []
    let something_changed = false
    let movie_url = ''
    for (let i=0; i < Object.keys(response_data['movies']).length; i++) {
      movie_url = Object.keys(response_data['movies'])[i]
      const movie_parts = movie_url.split('/')
      const movie_name = movie_parts[movie_parts.length-1]
      const movie = response_data['movies'][movie_url]

      for (let j=0; j < campaign_movies.length; j++) {
        const campaign_movie_url = campaign_movies[j]
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
      setGlobalStateVar({
        'movies': deepCopyMovies,
        'campaign_movies': new_campaign_movies,
      })
      addMovieAndSetActive(
        movie_url,
        deepCopyMovies,
        when_done,
      )
    }
  }

  static async loadRedactResults(job, when_done=(()=>{}), setGlobalStateVar, getGlobalStateVar) {
    const response_data = JSON.parse(job.response_data)
    const movies = getGlobalStateVar('movies')
    const request_data = JSON.parse(job.request_data)
    let deepCopyMovies = JSON.parse(JSON.stringify(movies))
    let movie_url = ''
    for (let i=0; i < Object.keys(response_data['movies']).length; i++) {
      movie_url = Object.keys(response_data['movies'])[i]
      if (!Object.keys(deepCopyMovies).includes(movie_url)) {
        deepCopyMovies[movie_url] = request_data['movies'][movie_url]
      }
      this.addToCampaignMovies(movie_url, setGlobalStateVar, getGlobalStateVar)
      const movie = response_data['movies'][movie_url]
      for (let j=0; j < Object.keys(movie['framesets']).length; j++) {
        const frameset_hash = Object.keys(movie['framesets'])[j]
        const frameset = movie['framesets'][frameset_hash]
        const redacted_image = frameset['redacted_image']
        deepCopyMovies[movie_url]['framesets'][frameset_hash]['redacted_image'] = redacted_image
      }
    }
    setGlobalStateVar({
      movies: deepCopyMovies,
      movie_url: movie_url,
    })
  }

  static async loadManualCompileDataSifterResults(job, when_done=(()=>{}), setGlobalStateVar, getGlobalStateVar) {
    const request_data = JSON.parse(job.request_data)
    this.loadMoviesFromTier1Source(
      request_data, 
      setGlobalStateVar,
      getGlobalStateVar
    )
    const resp_data = JSON.parse(job.response_data)
    const scanner_id = resp_data['id']

    const visibilityFlags = getGlobalStateVar('visibilityFlags')
    let deepCopyVFs = JSON.parse(JSON.stringify(visibilityFlags))
    for (let i=0; i < Object.keys(visibilityFlags['t1_matches']).length; i++) {
      const scanner_type = Object.keys(visibilityFlags['t1_matches'])[i]
      deepCopyVFs['t1_matches'][scanner_type] = false
    }

    const tier_1_scanners = getGlobalStateVar('tier_1_scanners')
    let deepCopyScanners = JSON.parse(JSON.stringify(tier_1_scanners))
    let deepCopyThisScanners = deepCopyScanners['data_sifter']
    deepCopyThisScanners[scanner_id] = resp_data
    const current_ids = getGlobalStateVar('current_ids')
    let deepCopyIds = JSON.parse(JSON.stringify(current_ids))
    deepCopyIds['t1_scanner']['data_sifter'] = scanner_id
    setGlobalStateVar({
      tier_1_scanners: deepCopyScanners,
      visibilityFlags: deepCopyVFs,
      current_ids: deepCopyIds,
    })
    // TODO I should be able to hang this in setGlobalStateVar, but it's not getting picked up
    setTimeout(when_done, 1000)
  }

  static async loadIllustrateResults(job, when_done=(()=>{}), setGlobalStateVar, getGlobalStateVar) {
    const req_data = JSON.parse(job.request_data)
    const movies = getGlobalStateVar('movies')
    const movie_url = req_data['movie_url']
    const frameset_hash = req_data['frameset_hash']
    const resp_data = JSON.parse(job.response_data)
    let deepCopyMovies = JSON.parse(JSON.stringify(movies))
    if (!Object.keys(deepCopyMovies).includes(movie_url)) {
      deepCopyMovies[req_data['movie_url']] = req_data['movie']
    }
    const illus_img_url = resp_data['illustrated_image_url']
    deepCopyMovies[movie_url]['framesets'][frameset_hash]['illustrated_image'] = illus_img_url
    setGlobalStateVar({
      movies: deepCopyMovies,
      movie_url: movie_url,
    })
    this.addToCampaignMovies(movie_url, setGlobalStateVar, getGlobalStateVar)
  }

  static async loadGetTimestampResults(job, when_done=(()=>{}), setGlobalStateVar, getGlobalStateVar) {
    const resp_data = JSON.parse(job.response_data)
    const movies = getGlobalStateVar('movies')
    const req_data = JSON.parse(job.request_data)
    let deepCopyMovies = JSON.parse(JSON.stringify(movies))
    let last_movie_url = ''
    for (let j=0; j < Object.keys(resp_data).length; j++) {
      const movie_url = Object.keys(resp_data)[j]
      if (!Object.keys(deepCopyMovies).includes(movie_url)) {
        deepCopyMovies[movie_url] = req_data['movies'][movie_url]
      }
      this.addToCampaignMovies(movie_url, setGlobalStateVar, getGlobalStateVar)
      if (resp_data[movie_url]) {
        deepCopyMovies[movie_url]['start_timestamp'] = resp_data[movie_url]
      }
      last_movie_url = movie_url
    }
    setGlobalStateVar({
      movies: deepCopyMovies,
      movie_url: last_movie_url,
    })
  }

  static loadGetFramesetMatchChartResults(job, when_done=(()=>{}), setGlobalStateVar, getGlobalStateVar) {
    const resp_data = JSON.parse(job.response_data)
    const results = getGlobalStateVar('results')
    if (!Object.keys(resp_data).includes('movies')) {
      return
    }
    let deepCopyResults = JSON.parse(JSON.stringify(results))
    if (!Object.keys(deepCopyResults).includes('movies')) {
      deepCopyResults = {'movies': {}}
    }
    for (let i=0; i < Object.keys(resp_data['movies']).length; i++) {
      const movie_url = Object.keys(resp_data['movies'])[i]
      deepCopyResults['movies'][movie_url] = resp_data['movies'][movie_url]
    }
    setGlobalStateVar({
      results: deepCopyResults,
    })
  }

  static loadGetMovieMatchChartResults(job, when_done=(()=>{}), setGlobalStateVar, getGlobalStateVar) {
    const resp_data = JSON.parse(job.response_data)
    const results = getGlobalStateVar('results')
    if (!Object.keys(resp_data).includes('movies')) {
      return
    }
    let deepCopyResults = JSON.parse(JSON.stringify(results))
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
    setGlobalStateVar({
      results: deepCopyResults,
    })
  }

  static async loadZipMovieResults(
    job, 
    when_done=(()=>{}), 
    setGlobalStateVar,
    getGlobalStateVar
  ) {
    const response_data = JSON.parse(job.response_data)
    const the_url = response_data.movie_url
    this.setMovieRedactedUrl(the_url, setGlobalStateVar, getGlobalStateVar)
  }

  static async loadRedactSingleResults(job, when_done=(()=>{}), setGlobalStateVar, getGlobalStateVar) {
    const resp_data = JSON.parse(job.response_data)
    const movies = getGlobalStateVar('movies')
    const req_data = JSON.parse(job.request_data)
    const movie_url = req_data['movie_url']
    const frameset_hash = req_data['frameset_hash']
    let deepCopyMovies = JSON.parse(JSON.stringify(movies))
    const redacted_image = resp_data['redacted_image_url']
    deepCopyMovies[movie_url]['framesets'][frameset_hash]['redacted_image'] = redacted_image
    setGlobalStateVar({
      movies: deepCopyMovies,
      movie_url: movie_url,
    })
  }

  static async getJobFailedTasks(job_id, when_done=(()=>{}), getUrl, fetch, buildJsonHeaders) {
    let job_url = getUrl('job_failed_tasks_url') + '/' + job_id
    await fetch(job_url, {
      method: 'GET',
      headers: buildJsonHeaders(),
    })
    .then((response) => response.json())
    .then((responseJson) => when_done(
      JSON.stringify(responseJson, undefined, 2))
    )
  }

  static async getJobResultData(job_id, when_done=(()=>{}), getUrl, fetch, buildJsonHeaders) {
    let job_url = getUrl('jobs_url') + '/' + job_id
    await fetch(job_url, {
      method: 'GET',
      headers: buildJsonHeaders(),
    })
    .then((response) => response.json())
    .then((responseJson) => {
      const request = JSON.parse(responseJson['job']['request_data'])
      const pretty_request = JSON.stringify(request, undefined, 2)
      let response = ''
      if (Object.keys(responseJson['job']).includes('response_data')) {
        const rd_string = responseJson['job']['response_data']
        if (rd_string !== 'None') {
          response = JSON.parse(responseJson['job']['response_data'])
        }
      }
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

  static async loadJobResults(
    job_id, 
    when_done=(()=>{}), 
    whenJobLoaded, 
    setGlobalStateVar,
    getGlobalStateVar,
    addMovieAndSetActive,
    getUrl,
    fetch_func,
    buildJsonHeaders,
    getJobs,
    saveStateCheckpoint
  ) {
    let job_url = getUrl('jobs_url') + '/' + job_id
    await fetch_func(job_url, {
      method: 'GET',
      headers: buildJsonHeaders(),
    })
    .then((response) => response.json())
    .then((responseJson) => {
      const job = responseJson['job']
      if ((job.app === 'analyze' && job.operation === 'scan_template_multi')
        || (job.app === 'analyze' && job.operation === 'template_threaded')) {
        this.loadTemplateResults(
          job, 
          when_done, 
          setGlobalStateVar, 
          getGlobalStateVar
        )
      } else if (job.app === 'analyze' && job.operation === 'get_timestamp_threaded') {
        this.loadGetTimestampResults(
          job, when_done, setGlobalStateVar, getGlobalStateVar
        )
			} else if ((job.app === 'analyze' && job.operation === 'template_match_chart')  ||
          (job.app === 'analyze' && job.operation === 'selected_area_chart') ||
          (job.app === 'analyze' && job.operation === 'ocr_match_chart')) {
        this.loadGetMovieMatchChartResults(
          job, when_done, setGlobalStateVar, getGlobalStateVar
        )
			} else if (
        (job.app === 'analyze' && job.operation === 'selection_grower_chart')
      ) {
        this.loadGetFramesetMatchChartResults(
          job, when_done, setGlobalStateVar, getGlobalStateVar
        )
			} else if (job.app === 'analyze' && job.operation === 'ocr_threaded') {
        this.loadOcrResults(
          job, 
          when_done,
          setGlobalStateVar, 
          getGlobalStateVar
        )
			} else if (job.app === 'analyze' && job.operation === 'selected_area_threaded') {
        this.loadSelectedAreaResults(
          job, 
          when_done, 
          setGlobalStateVar, 
          getGlobalStateVar
        )
			} else if (job.app === 'analyze' && job.operation === 'mesh_match_threaded') {
        this.loadMeshMatchResults(
          job, 
          when_done, 
          setGlobalStateVar, 
          getGlobalStateVar
        )
			} else if (job.app === 'analyze' && job.operation === 'selection_grower_threaded') {
        this.loadSelectionGrowerResults(
          job, 
          when_done, 
          setGlobalStateVar, 
          getGlobalStateVar
        )
			} else if (job.app === 'analyze' && job.operation === 'data_sifter_threaded') {
        this.loadDataSifterResults(
          job, 
          when_done, 
          setGlobalStateVar, 
          getGlobalStateVar
        )
			} else if (job.app === 'analyze' && job.operation === 'focus_finder_threaded') {
        this.loadFocusFinderResults(
          job, 
          when_done, 
          setGlobalStateVar, 
          getGlobalStateVar
        )
			} else if (job.app === 'analyze' && job.operation === 't1_filter_threaded') {
        this.loadT1FilterResults(
          job, 
          when_done, 
          setGlobalStateVar, 
          getGlobalStateVar
        )
			} else if ((job.app === 'parse' && job.operation === 'split_and_hash_threaded')) {
        this.loadMoviesFromJob(
          job, when_done, addMovieAndSetActive, getGlobalStateVar
        )
			} else if (job.app === 'pipeline'  && 
          job.operation === 'pipeline' && 
          job.description === 'top level job for pipeline fetch_split_hash_secure_file') {
        this.loadMoviesFromJob(
          job, when_done, addMovieAndSetActive, getGlobalStateVar
        )
			} else if (job.app === 'pipeline'  && 
          job.operation === 'pipeline' && 
          job.description.indexOf('scan_template_and_redact') > -1) {
        this.loadRedactResults(
          job, when_done, setGlobalStateVar, getGlobalStateVar
        )
			} else if (job.app === 'pipeline'  && 
          job.operation === 'pipeline' && 
          job.description.indexOf('scan_ocr_and_redact') > -1) {
        this.loadRedactResults(
          job, when_done, setGlobalStateVar, getGlobalStateVar 
        )
			} else if (job.app === 'parse' && job.operation === 'split_threaded') {
        this.loadSplitResults(
          job, when_done, addMovieAndSetActive, getGlobalStateVar
        )
			} else if (job.app === 'parse' && job.operation === 'hash_movie') {
        this.loadHashResults(
          job, when_done, addMovieAndSetActive, getGlobalStateVar
        )
			} else if (job.app === 'parse' && job.operation === 'copy_movie') {
        this.loadCopyResults(
          job, when_done, addMovieAndSetActive, getGlobalStateVar
        )
			} else if (job.app === 'parse' && job.operation === 'rebase_movies') {
        this.loadRebaseMoviesResults(
          job, 
          when_done, 
          setGlobalStateVar, 
          getGlobalStateVar, 
          addMovieAndSetActive
        )
			} else if (job.app === 'parse' && job.operation === 'rebase_jobs') {
        getJobs() 
			} else if (job.app === 'parse' && job.operation === 'change_movie_resolution') {
        this.loadChangeResolutionResults(
          job, 
          when_done, 
          addMovieAndSetActive, 
          getGlobalStateVar
        )
			} else if (job.app === 'parse' && job.operation === 'render_subsequence') {
        this.loadRenderSubsequenceResults(
          job, when_done, setGlobalStateVar, getGlobalStateVar
        )
			} else if (
          (job.app === 'redact' && job.operation === 'redact') ||
          (job.app === 'redact' && job.operation === 'redact_t1')
      ) {
        this.loadRedactResults(
          job, when_done, setGlobalStateVar, getGlobalStateVar
        )
      } else if (job.app === 'redact' && job.operation === 'redact_single') {
        this.loadRedactSingleResults(
          job, when_done, setGlobalStateVar, getGlobalStateVar
        )
			} else if (job.app === 'parse' && job.operation === 'zip_movie') {
        this.loadZipMovieResults(
          job, when_done, setGlobalStateVar, getGlobalStateVar
        )
			} else if (job.app === 'redact' && job.operation === 'illustrate') {
        this.loadIllustrateResults(
          job, when_done, setGlobalStateVar, getGlobalStateVar
        )
			} else if (job.app === 'analyze' && job.operation === 'manual_compile_data_sifter') {
        this.loadManualCompileDataSifterResults(
          job, when_done, setGlobalStateVar, getGlobalStateVar
        )
			} else if (
        (job.app === 'pipeline' && job.operation === 'pipeline') ||
        (job.app === 'pipeline' && job.operation === 't1_sum') ||
			  (job.app === 'analyze' && job.operation === 'intersect') 
      ) {
          if (this.jobHasT1Output(job)) {
            this.loadPseudoTier1Results(
              job, 
              when_done, 
              setGlobalStateVar, 
              getGlobalStateVar
            )
          } else {
            when_done(job)
          }
      } else {
        when_done(responseJson)
      }
      return responseJson
    })
    .then((responseJson) => {
      if (Object.keys(whenJobLoaded).includes(job_id)) {
        const after_loaded = whenJobLoaded[job_id]['after_loaded']
        if (after_loaded) {
          after_loaded()
        }
        const deleteJob = whenJobLoaded[job_id]['delete_job_after_loading']
        if (deleteJob) {
          this.cancelJob(job_id, getUrl, fetch_func, buildJsonHeaders, getJobs)
        }
        this.unwatchJob(job_id, whenJobLoaded, setGlobalStateVar)
      }
      saveStateCheckpoint()
    })
    .catch((error) => {
      console.error(error);
    })
  }

  static jobHasT1Output(job) {
    if (job['response_data'] === 'None') {
      return
    }
    const rd = JSON.parse(job['response_data'])
    if (
      rd &&
      Object.keys(rd).includes('movies') &&
      Object.keys(rd['movies']).length > 0
    ) {
      if (Object.keys(rd).includes('source')) {
        if (Object.keys(rd['movies']).length === 1) {
          return
        }
        delete rd['movies']['source']
      }
      const movie_url = Object.keys(rd['movies'])[0]
      if (
        Object.keys(rd['movies'][movie_url]).includes('framesets') && 
        !Object.keys(rd['movies'][movie_url]).includes('frames')
      ) {
        return true
      }
    }
  }

  static async wrapUpJob(job_id, getUrl, fetch_func, buildJsonHeaders, getJobs) {
    await fetch_func(getUrl('wrap_up_job_url'), {
      method: 'POST',
      headers: buildJsonHeaders(),
      body: JSON.stringify({
        job_id: job_id,
      }),
    })
    .then(() => {
      getJobs()
    })
    .catch((error) => {
      console.error(error);
    })
  }

  static async restartPipelineJob(job_id, getUrl, fetch_func, buildJsonHeaders, when_done=(()=>{})) {
    await fetch_func(getUrl('restart_pipeline_job_url'), {
      method: 'POST',
      headers: buildJsonHeaders(),
      body: JSON.stringify({
        job_id: job_id,
      }),
    })
    .then((response) => response.json())
    .then((responseJson) => {
      when_done(responseJson)
      return responseJson
    })
    .catch((error) => {
      console.error(error);
    })
  }

  static async submitJob(
    hash_in, 
    whenJobLoaded, 
    preserveAllJobs, 
    setGlobalStateVar, 
    getGlobalStateVar, 
    getJobs, 
    fetch_func, 
    buildJsonHeaders, 
    getUrl
  ) {
    const cv_workers = getGlobalStateVar('cv_workers')
    const current_workbook_id = getGlobalStateVar('current_workbook_id')
    const user = getGlobalStateVar('user')
    let the_job_data = hash_in.hasOwnProperty('job_data') ? hash_in['job_data'] : {}
    let when_submit_complete = hash_in.hasOwnProperty('after_submit') ? hash_in['after_submit'] : (()=>{})
    let delete_job_after_loading = hash_in.hasOwnProperty('delete_job_after_loading') ? hash_in['delete_job_after_loading'] : false
    let when_fetched = hash_in.hasOwnProperty('after_loaded') ? hash_in['after_loaded'] : (()=>{})
    let when_failed = hash_in.hasOwnProperty('when_failed') ? hash_in['when_failed'] : (()=>{})
    let current_user = ''
    if (user && Object.keys(user).includes('id')) {
      current_user = user['id']
    }
    let build_obj = {
      app: the_job_data['app'],
      operation: the_job_data['operation'],
      request_data: the_job_data['request_data'],
      response_data: the_job_data['response_data'],
      owner: current_user,
      description: the_job_data['description'],
      workbook_id: current_workbook_id,
    }

    const routing_data = this.getJobRoutingData(build_obj, cv_workers)
    if (routing_data) {
      build_obj['routing_data'] = routing_data
    }

    if (Object.keys(hash_in).includes('lifecycle_data')) {
      build_obj['lifecycle_data'] = hash_in['lifecycle_data']
    }

    await fetch_func(getUrl('jobs_url'), {
      method: 'POST',
      headers: buildJsonHeaders(),
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
        },
        whenJobLoaded, 
        preserveAllJobs, 
        setGlobalStateVar
      )
    })
    .then(() => {
      getJobs()
    })
    .catch((error) => {
      console.error(error);
      when_failed()
    })
  }

  static async getPipelineJobStatus(
      job_id,
      when_done,
      getUrl,
      fetch_func,
      buildJsonHeaders,
  ) {
    let job_url = getUrl('pipeline_job_status_url') + '/' + job_id
    await fetch_func(job_url, {
      method: 'GET',
      headers: buildJsonHeaders(),
    })
    .then((response) => response.json())
    .then((responseJson) => {
      when_done(responseJson)
    })
  }

}

export default JobLogic;
