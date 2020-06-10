import React from 'react';
import {
  makePlusMinusRowLight,
} from './SharedControls'

class SessionControls extends React.Component {

  constructor(props) {
    super(props)
    this.recognizer = {}
  }

  buildWorkbookPickerButton() {
    let return_array = []
    if (this.props.workbooks.length) {
      return_array.push(
        <div key='lsls234'>
        <button
            key='wb_names_button'
            className='btn btn-primary ml-2 mt-2 dropdown-toggle'
            type='button'
            id='loadWorkbookDropdownButton'
            data-toggle='dropdown'
            area-haspopup='true'
            area-expanded='false'
        >
          Load Workbook
        </button>
        <div className='dropdown-menu' aria-labelledby='loadWorkbookDropdownButton'>
      {this.props.workbooks.map((value, index) => {
        return (
          <button 
              className='dropdown-item'
              key={index}
              onClick={() => this.doWorkbookLoad(value['id'])}
          >
            {value['name']}
          </button>
        )
      })}
          <button 
              className='dropdown-item'
              key='000'
              onClick={() => this.doWorkbookLoad('-1')}
          >
            none
          </button>
        </div>
        </div>
      )
    }
    return return_array
  }

  doWorkbookLoad(workbook_id) {
    this.props.loadWorkbook(
      workbook_id,
      this.props.displayInsightsMessage('Workbook has been loaded')
    )
    this.props.getPipelines()
  }

  buildWorkbookDeleteButton() {
    let return_array = []
    if (this.props.workbooks.length) {
      return_array.push(
        <div key='ls224'>
        <button
            key='wb_delete_button'
            className='btn btn-primary ml-2 mt-2 dropdown-toggle'
            type='button'
            id='deleteWorkbookDropdownButton'
            data-toggle='dropdown'
            area-haspopup='true'
            area-expanded='false'
        >
          Delete Workbook
        </button>
        <div className='dropdown-menu' aria-labelledby='deleteWorkbookDropdownButton'>
      {this.props.workbooks.map((value, index) => {
        return (
          <button 
              className='dropdown-item'
              key={index}
              onClick={() => 
                this.props.deleteWorkbook(value['id'], 
                this.props.displayInsightsMessage('Workbook has been deleted'))
              }
          >
            {value['name']}
          </button>
        )
      })}
        </div>
        </div>
      )
    }
    return return_array
  }

  buildGlobalStateBox() {
    return (
      <textarea
         cols='80'
         rows='2'
         value=''
         onChange={(event) => this.props.updateGlobalState(event.target.value)}
      />
    )
  }

  buildCampaignMoviesBox() {
    const campaign_movies_string = this.props.campaign_movies.join('\n')
    return (
      <textarea
         cols='80'
         rows='10'
         value={campaign_movies_string}
         onChange={(event) => this.props.setCampaignMovies(event.target.value)}
      />
    )
  }

  buildWorkbookPlaySoundCheckbox() {
    let checked_state = ''
    if (this.props.current_workbook_play_sound) {
      checked_state = 'checked'
    } 
    return (
      <div className='row mt-3 bg-light rounded'>
        <input
          className='ml-2 mr-2 mt-1'
          id='toggle_play_sound'
          checked={checked_state}
          type='checkbox'
          onChange={(event) => this.setWorkbookSound(event.target.value)}
        />
        Play Sound
      </div>
    )
  }

  buildWhenDoneSelector() {
    return (
      <div>
        <select
            name='when_done_selector'
            onChange={(event) => this.props.setGlobalStateVar('whenDoneTarget', event.target.value)}
            value={this.props.whenDoneTarget}
        >
          <option value=''>--none--</option>
          <option value='learn_dev'>Learn Dev</option>
        </select>
        <span
          className='ml-2'
        >
          Provide link on Image panel to forward to this instance
        </span>
      </div>
    )
  }

  buildUserToneSelector() {
    return (
      <div>
        <select
            name='when_done_selector'
            onChange={(event) => this.setUserTone(event.target.value)}
            value={this.props.session_audio['userTone']}
        >
          <option value=''>--none--</option>
          <option value='blip'>Blip</option>
          <option value='lfo'>LFO</option>
          <option value='kick_snare'>Kick+Snare</option>
        </select>
        <span
          className='ml-2'
        >
          user tone
        </span>
      </div>
    )
  }

  buildWorkbookId() {
    if (this.props.current_workbook_name === '') {
      return ''
    }
    const the_id = this.props.current_workbook_id
    return (
      <div className='row ml-2 bg-light'>
        <div
            className='d-inline'
        >
          Workbook Id: 
        </div>
        <div 
            className='d-inline ml-2'
        >
          {the_id}
        </div>
      </div>
    )
  }

  buildWorkbookName() {
    return (
      <div className='row ml-2 mt-3 bg-light'>
        <div
            className='d-inline'
        >
          Workbook Name: 
        </div>
        <div
            className='d-inline ml-2'
        >
          <input 
              id='workbook_name'
              key='workbook_name_1'
              size='20'
              value={this.props.current_workbook_name}
              onChange={(event) => this.props.saveWorkbookName(event.target.value)}
          />
        </div>
      </div>
    )
  }

  buildPingButton() {
    return (
      <div className='d-inline'>
        <button
            className='btn btn-primary mt-2 ml-2'
            onClick={() => this.props.callPing()}
        >
          Ping
        </button>
      </div>
    )
  }

  buildGetVersionButton() {
    return (
      <div className='d-inline'>
        <button
            className='btn btn-primary mt-2 ml-2'
            onClick={() => this.props.callGetVersion()}
        >
          Get Api Version
        </button>
      </div>
    )
  }

  buildWorkbookSaveButton() {
    return (
      <div className='d-inline'>
        <button
            className='btn btn-primary mt-2 ml-2'
            onClick={() => 
              this.props.saveWorkbook(
                this.props.displayInsightsMessage('Workbook has been saved')
              )
            }
        >
          Save Workbook
        </button>
      </div>
    )
  }

  buildRebaseMoviesButton() {
    return (
      <div className='d-inline'>
        <button
            className='btn btn-primary'
            onClick={() => this.props.submitInsightsJob('rebase_movies')}
        >
          Rebase Movies
        </button>
      </div>
    )
  }

  buildRebaseJobsButton() {
    return (
      <div className='d-inline ml-2'>
        <button
            className='btn btn-primary'
            onClick={() => this.props.submitInsightsJob('rebase_jobs')}
        >
          Rebase Jobs
        </button>
      </div>
    )
  }

  buildSuLink() {
    return (
      <div className='d-inline p-0'>
        <button
            className='btn btn-link'
            onClick={() => this.props.setGlobalStateVar('user', {})}
        >
          shed user
        </button>
      </div>
    )
  }

  buildImpersonateLink() {
    return (
      <div>
        <div className='d-inline'>
          Impersonate User
        </div>
        <div className='d-inline ml-2'>
          <input 
              size='25'
              onChange={(event) => this.props.impersonateUser(event.target.value)}
          />
        </div>
      </div>
    )
  }

  buildPanelsCheckboxes() {
    let show_templates_checked = ''
    if (this.props.visibilityFlags['templates']) {
      show_templates_checked = 'checked'
    }
    let show_hog_checked = ''
    if (this.props.visibilityFlags['hog']) {
      show_hog_checked = 'checked'
    }
    let show_selected_area_checked = ''
    if (this.props.visibilityFlags['selectedArea']) {
      show_selected_area_checked = 'checked'
    }
    let show_movie_sets_checked = ''
    if (this.props.visibilityFlags['movieSets']) {
      show_movie_sets_checked = 'checked'
    }
    let show_results_checked = ''
    if (this.props.visibilityFlags['results']) {
      show_results_checked = 'checked'
    }
    let show_filesystem_checked = ''
    if (this.props.visibilityFlags['filesystem']) {
      show_filesystem_checked = 'checked'
    }
    let show_annotate_checked = ''
    if (this.props.visibilityFlags['annotate']) {
      show_annotate_checked = 'checked'
    }
    let show_telemetry_checked = ''
    if (this.props.visibilityFlags['telemetry']) {
      show_telemetry_checked = 'checked'
    }
    let show_ocr_checked = ''
    if (this.props.visibilityFlags['ocr']) {
      show_ocr_checked = 'checked'
    }
    let show_ocr_scene_analysis_checked = ''
    if (this.props.visibilityFlags['ocr_scene_analysis']) {
      show_ocr_scene_analysis_checked = 'checked'
    }
    let show_entity_finder_checked = ''
    if (this.props.visibilityFlags['entity_finder']) {
      show_entity_finder_checked = 'checked'
    }
    let show_ocr_movie_analysis_checked = ''
    if (this.props.visibilityFlags['ocr_movie_analysis']) {
      show_ocr_movie_analysis_checked = 'checked'
    }
    let show_diffs_checked = ''
    if (this.props.visibilityFlags['diffs']) {
      show_diffs_checked = 'checked'
    }
    let show_redact_checked = ''
    if (this.props.visibilityFlags['redact']) {
      show_redact_checked = 'checked'
    }
    let show_zip_checked = ''
    if (this.props.visibilityFlags['zip']) {
      show_zip_checked = 'checked'
    }
    let show_pipelines_checked = ''
    if (this.props.visibilityFlags['pipelines']) {
      show_pipelines_checked = 'checked'
    }

    return (
      <div>
        <div className='row mt-3 bg-light rounded'>
          <input
            className='ml-2 mr-2 mt-1'
            checked={show_templates_checked}
            type='checkbox'
            onChange={() => this.props.toggleShowVisibility('templates')}
          />
          Show Templates
        </div>

        <div className='row mt-3 bg-light rounded'>
          <input
            className='ml-2 mr-2 mt-1'
            checked={show_hog_checked}
            type='checkbox'
            onChange={() => this.props.toggleShowVisibility('hog')}
          />
          Show Hog
        </div>

        <div className='row mt-3 bg-light rounded'>
          <input
            className='ml-2 mr-2 mt-1'
            checked={show_selected_area_checked}
            type='checkbox'
            onChange={() => this.props.toggleShowVisibility('selectedArea')}
          />
          Show Selected Area
        </div>

        <div className='row mt-3 bg-light rounded'>
          <input
            className='ml-2 mr-2 mt-1'
            checked={show_annotate_checked}
            type='checkbox'
            onChange={() => this.props.toggleShowVisibility('annotate')}
          />
          Show Annotate
        </div>

        <div className='row mt-3 bg-light rounded'>
          <input
            className='ml-2 mr-2 mt-1'
            checked={show_telemetry_checked}
            type='checkbox'
            onChange={() => this.props.toggleShowVisibility('telemetry')}
          />
          Show Telemetry
        </div>

        <div className='row mt-3 bg-light rounded'>
          <input
            className='ml-2 mr-2 mt-1'
            checked={show_ocr_checked}
            type='checkbox'
            onChange={() => this.props.toggleShowVisibility('ocr')}
          />
          Show Ocr
        </div>

        <div className='row mt-3 bg-light rounded'>
          <input
            className='ml-2 mr-2 mt-1'
            checked={show_ocr_scene_analysis_checked}
            type='checkbox'
            onChange={() => this.props.toggleShowVisibility('ocr_scene_analysis')}
          />
          Show Ocr Scene Analysis
        </div>

        <div className='row mt-3 bg-light rounded'>
          <input
            className='ml-2 mr-2 mt-1'
            checked={show_entity_finder_checked}
            type='checkbox'
            onChange={() => this.props.toggleShowVisibility('entity_finder')}
          />
          Show Entity Finder
        </div>

        <div className='row mt-3 bg-light rounded'>
          <input
            className='ml-2 mr-2 mt-1'
            checked={show_diffs_checked}
            type='checkbox'
            onChange={() => this.props.toggleShowVisibility('diffs')}
          />
          Show Diffs
        </div>

        <div className='row mt-3 bg-light rounded'>
          <input
            className='ml-2 mr-2 mt-1'
            checked={show_redact_checked}
            type='checkbox'
            onChange={() => this.props.toggleShowVisibility('redact')}
          />
          Show Redact
        </div>

        <div className='row mt-3 bg-light rounded'>
          <input
            className='ml-2 mr-2 mt-1'
            checked={show_zip_checked}
            type='checkbox'
            onChange={() => this.props.toggleShowVisibility('zip')}
          />
          Show Zip
        </div>

        <div className='row mt-3 bg-light rounded'>
          <input
            className='ml-2 mr-2 mt-1'
            checked={show_movie_sets_checked}
            type='checkbox'
            onChange={() => this.props.toggleShowVisibility('movieSets')}
          />
          Show Movie Sets
        </div>

        <div className='row mt-3 bg-light rounded'>
          <input
            className='ml-2 mr-2 mt-1'
            checked={show_results_checked}
            type='checkbox'
            onChange={() => this.props.toggleShowVisibility('results')}
          />
          Show Results
        </div>

        <div className='row mt-3 bg-light rounded'>
          <input
            className='ml-2 mr-2 mt-1'
            checked={show_ocr_movie_analysis_checked}
            type='checkbox'
            onChange={() => this.props.toggleShowVisibility('ocr_movie_analysis')}
          />
          Show Ocr Movie Analysis
        </div>

        <div className='row mt-3 bg-light rounded'>
          <input
            className='ml-2 mr-2 mt-1'
            checked={show_filesystem_checked}
            type='checkbox'
            onChange={() => this.props.toggleShowVisibility('filesystem')}
          />
          Show Filesystem
        </div>

        <div className='row mt-3 bg-light rounded'>
          <input
            className='ml-2 mr-2 mt-1'
            checked={show_pipelines_checked}
            type='checkbox'
            onChange={() => this.props.toggleShowVisibility('pipelines')}
          />
          Show Pipelines
        </div>
      </div>
    )
  }

  buildFramesetDiscriminator() {
    return (
      <div className='row mt-3 bg-light rounded'>
        Frameset Discriminator
        <div
            className='d-inline ml-2'
        >   
           <select
              title='Frameset Discriminator'
              name='frameset_discriminator'
              value={this.props.frameset_discriminator}
              onChange={(event) => this.props.setGlobalStateVar('frameset_discriminator', event.target.value)}
           >
            <option value='gray64'>gray 64x64</option>
            <option value='gray32'>gray 32x32</option>
            <option value='gray16'>gray 16x16</option>
            <option value='gray8'>gray 8x8 (default)</option>
            <option value='gray6'>gray 6x6</option>
            <option value='gray4'>gray 4x4</option>
          </select>
        </div>
      </div>
    )
  }

  startSpeechRecognition() {
    let grammar_list = new window.webkitSpeechGrammarList();
    var colors = ['Caulton', 'DeVos', 'Cannonball', 'Flubber']
    var grammar = '#JSGF V1.0; grammar colors; public <color> = ' + colors.join(' | ') + ' ;'
    grammar_list.addFromString(grammar, 1)

    this.recognizer = new window.webkitSpeechRecognition();
    this.recognizer.continuous = true;
    this.recognizer.interimResults = true;
    this.recognizer.grammars = grammar_list

    this.recognizer.onresult = function (event) {
      var final = "FINAL: ";
      var interim = "INTERIM: ";
      for (var i = 0; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          final += event.results[i][0].transcript;
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      document.getElementById('session_recognized_text_final').innerHTML = final
      document.getElementById('session_recognized_text_interim').innerHTML = interim
    }
    this.recognizer.start()
  }

  stopSpeechRecognition() {
    this.recognizer.stop()
  }

  buildSpeechRecognitionButton() {
    return (
      <div>
        <div className='d-inline'>
          Speech Recognition
        </div>
        <div className='d-inline ml-2'>
          <button
              className='btn btn-primary'
              onClick={() => this.startSpeechRecognition()}
          >
            Start
          </button>
        </div>
        <div className='d-inline ml-2'>
          <button
              className='btn btn-primary'
              onClick={() => this.stopSpeechRecognition()}
          >
            Stop
          </button>
        </div>
        <div className='d-inline ml-2' id='session_recognized_text_final' />
        <div className='d-inline ml-2' id='session_recognized_text_interim' />
      </div>
    )
  }

  setVoice() {
    const voice_index = this.getVoiceIndex()
    const pitch = parseFloat(document.getElementById('session_voice_pitch').value)
    const rate = parseFloat(document.getElementById('session_voice_speed').value)
    const voice_obj = {
      index: voice_index,
      pitch: pitch,
      rate: rate,
    }
    let deepCopySessionAudio = JSON.parse(JSON.stringify(this.props.session_audio))
    deepCopySessionAudio['voice'] = voice_obj
    this.props.setGlobalStateVar('session_audio', deepCopySessionAudio)
  }

  getVoiceIndex() {
    const vs = document.getElementById('session_voices_select').value
    let vi = vs.split(':')[0]
    if (vi) {
      vi = parseInt(vi)
    }
    return vi
  }

  tryOutVoice() {
    const test_text = "Keep the change you filty animal"
    const voice_index = this.getVoiceIndex()
    var msg = new SpeechSynthesisUtterance(test_text)
    const voice = window.speechSynthesis.getVoices()[voice_index]
    msg.voice = voice
    msg.pitch = parseFloat(document.getElementById('session_voice_pitch').value)
    msg.rate = parseFloat(document.getElementById('session_voice_speed').value)
    window.speechSynthesis.speak(msg);
  }

  buildVoiceSpeedList() {
    return (
      <div>
        <div className='d-inline'>
          Voice Speed
        </div>
        <div className='d-inline'>
          <select
              id='session_voice_speed'
              onChange={() => this.tryOutVoice()}
          >
            <option value='1'>1</option>
            <option value='.1'>.1</option>
            <option value='.2'>.2</option>
            <option value='.3'>.3</option>
            <option value='.4'>.4</option>
            <option value='.5'>.5</option>
            <option value='.6'>.6</option>
            <option value='.7'>.7</option>
            <option value='.8'>.8</option>
            <option value='.9'>.9</option>
            <option value='1'>1</option>
            <option value='1.5'>1.5</option>
            <option value='2'>2</option>
          </select>
        </div>
      </div>
    )
  }

  buildVoicePitchList() {
    return (
      <div>
        <div className='d-inline'>
          Voice Pitch
        </div>
        <div className='d-inline'>
          <select
              id='session_voice_pitch'
              onChange={() => this.tryOutVoice()}
          >
            <option value='1'>1</option>
            <option value='.1'>.1</option>
            <option value='.2'>.2</option>
            <option value='.3'>.3</option>
            <option value='.4'>.4</option>
            <option value='.5'>.5</option>
            <option value='.6'>.6</option>
            <option value='.7'>.7</option>
            <option value='.8'>.8</option>
            <option value='.9'>.9</option>
            <option value='1'>1</option>
            <option value='1.5'>1.5</option>
            <option value='2'>2</option>
          </select>
        </div>
      </div>
    )
  }

  buildVoiceList(voices) {
    const voice_speed_list = this.buildVoiceSpeedList()
    const voice_pitch_list = this.buildVoicePitchList()
    return (
      <div>
        <div className='d-inline'>
          Voices
        </div>
        <div className='d-inline'>
          <select
              title='Voices'
              name='session_voices_select'
              id='session_voices_select'
              onChange={() => this.tryOutVoice()}
          >
            {voices.map((voice, index) => {
              const add_value = index.toString() + ':' + voice['voiceURI'] + ':' + voice['lang']
              return (
                <option key={index} value={add_value}> {add_value} </option>
              )
            })}
          </select>
          <div className='d-inline ml-2'>
            <button
                className='btn btn-primary'
                onClick={() => this.setVoice()}
            >
              Save
            </button>
          </div>
        </div>
        <div>
          {voice_speed_list}
        </div>
        <div>
          {voice_pitch_list}
        </div>
      </div>
    )
  }

  buildVoiceSelector() {
    if (window.speechSynthesis.getVoices()) {
      return this.buildVoiceList(window.speechSynthesis.getVoices())
    } else {
      let app_this = this
      window.speechSynthesis.onvoiceschanged = function() {
        return app_this.buildVoiceList(window.speechSynthesis.getVoices())
      }
    }
  }

  togglePlaySound() {
    const new_val = !this.props.session_audio['playSound']
    let deepCopySessionAudio = JSON.parse(JSON.stringify(this.props.session_audio))
    deepCopySessionAudio['playSound'] = new_val
    this.props.setGlobalStateVar('session_audio', deepCopySessionAudio)
  }

  setUserTone(new_val) {
    let deepCopySessionAudio = JSON.parse(JSON.stringify(this.props.session_audio))
    deepCopySessionAudio['userTone'] = new_val
    this.props.setGlobalStateVar('session_audio', deepCopySessionAudio)
  }

  render() {
    const campaign_movies_box = this.buildCampaignMoviesBox()
    const recognition_button = this.buildSpeechRecognitionButton()
    const voice_selector = this.buildVoiceSelector()
    const update_state_box = this.buildGlobalStateBox()
    const workbook_load_button = this.buildWorkbookPickerButton()
    const workbook_delete_button = this.buildWorkbookDeleteButton()
    const workbook_name = this.buildWorkbookName()
    const workbook_id = this.buildWorkbookId()
    const show_hide_user = makePlusMinusRowLight('user', 'session_user_div')
    const show_hide_panels = makePlusMinusRowLight('panels', 'session_panels_div')
    const show_hide_audio = makePlusMinusRowLight('session audio', 'session_audio_div')
    const show_hide_data = makePlusMinusRowLight('data', 'session_data_div')
    const su_link = this.buildSuLink()
    const impersonate_link = this.buildImpersonateLink()
    const panels_checkboxes = this.buildPanelsCheckboxes() 

    let play_sound_checked = ''
    if (this.props.session_audio['playSound']) {
      play_sound_checked = 'checked'
    }
    let preserve_all_jobs_checked = ''
    if (this.props.preserveAllJobs) {
      preserve_all_jobs_checked = 'checked'
    }
    let preserve_movie_audio_checked = ''
    if (this.props.preserve_movie_audio) {
      preserve_movie_audio_checked = 'checked'
    }
    const when_done_selector = this.buildWhenDoneSelector()
    const user_tone_selector = this.buildUserToneSelector()
    const ping_button = this.buildPingButton() 
    const get_version_button = this.buildGetVersionButton() 
    const workbook_save_button = this.buildWorkbookSaveButton()
    const rebase_movies_button = this.buildRebaseMoviesButton()
    const rebase_jobs_button = this.buildRebaseJobsButton()
    const frameset_discriminator = this.buildFramesetDiscriminator()

    return (
        <div className='row bg-light rounded mt-3'>
          <div className='col'>
            <div className='row'>
              <div 
                className='col-lg-10 h3'
              > 
                session
              </div>
              <div className='col-lg-1 float-right'>
                <button
                    className='btn btn-link'
                    aria-expanded='false'
                    data-target='#session_body'
                    aria-controls='session_body'
                    data-toggle='collapse'
                    type='button'
                >
                  +/-
                </button>
              </div>
            </div>

            <div 
                id='session_body' 
                className='row collapse'
            >
              <div id='session_main' className='col'>

                <div className='row mt-3 bg-light rounded'>
                  {ping_button}
                  {get_version_button}

                  <div className='d-inline'>
                      {workbook_load_button}
                  </div>

                  <div className='d-inline'>
                      {workbook_delete_button}
                  </div>
                  {workbook_save_button}

                </div>

                <div className='mt-2'>
                  {rebase_movies_button}
                  {rebase_jobs_button}
                </div>

                {workbook_name}
                {workbook_id}
                {frameset_discriminator}

                <div className='row mt-3 bg-light rounded'>
                  {when_done_selector}
                </div>

                <div className='row mt-3 bg-light rounded'>
                  <input
                    className='ml-2 mr-2 mt-1'
                    id='toggle_preserve_all_jobs'
                    checked={preserve_all_jobs_checked}
                    type='checkbox'
                    onChange={() => this.props.toggleGlobalStateVar('preserveAllJobs')}
                  />
                  Preserve All Jobs (typically for troubleshooting)
                </div>

                <div className='row mt-3 bg-light rounded'>
                  <input
                    className='ml-2 mr-2 mt-1'
                    id='toggle_preserve_movie_audio'
                    checked={preserve_movie_audio_checked}
                    type='checkbox'
                    onChange={(event) => this.props.toggleGlobalStateVar('preserve_movie_audio')}
                  />
                  Preserve Movie Audio
                </div>

                {show_hide_user}
                <div
                    id='session_user_div'
                    className='collapse'
                >
                  <div>
                    {su_link}
                  </div>
                  <div>
                    {impersonate_link}
                  </div>
                </div>

                {show_hide_audio}
                <div
                    id='session_audio_div'
                    className='collapse'
                >
                  <div className='row mt-3 bg-light rounded'>
                    <input
                      className='ml-2 mr-2 mt-1'
                      checked={play_sound_checked}
                      type='checkbox'
                      onChange={() => this.togglePlaySound()}
                    />
                    Play Sound
                  </div>

                  <div className='row mt-3 bg-light rounded'>
                    {user_tone_selector}
                  </div>

                  <div className='row mt-3 bg-light rounded'>
                    {voice_selector}
                  </div>

                  <div className='row mt-3 bg-light rounded'>
                    {recognition_button}
                  </div>
                </div>

                {show_hide_panels}
                <div
                    id='session_panels_div'
                    className='collapse'
                >
                  {panels_checkboxes}
                </div>

                {show_hide_data}
                <div
                    id='session_data_div'
                    className='collapse'
                >
                  <div className='row mt-4'>
                    <div className='d-inline'>
                      <span className='h5'>Campaign Movies</span>
                      {campaign_movies_box}
                    </div>
                  </div>

                  <div className='row mt-4'>
                    <div className='d-inline'>
                      <span className='h5'>Update Global State (paste json below)</span>
                      {update_state_box}
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

export default SessionControls;
