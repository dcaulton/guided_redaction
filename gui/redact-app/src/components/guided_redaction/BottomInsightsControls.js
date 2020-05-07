import React from 'react';
import TemplateControls from './TemplateControls'
import AnnotationControls from './AnnotationControls'
import TelemetryControls from './TelemetryControls'
import SelectedAreaControls from './SelectedAreaControls'
import OcrControls from './OcrControls'
import OcrSceneAnalysisControls from './OcrSceneAnalysisControls'
import EntityFinderControls from './EntityFinderControls'
import OcrMovieAnalysisControls from './OcrMovieAnalysisControls'
import DiffControls from './DiffControls'
import RedactControls from './RedactControls'
import ZipControls from './ZipControls'
import MovieSetsControls from './MovieSetsControls'
import ResultsControls from './ResultsControls'
import FilesystemControls from './FilesystemControls'
import PipelineControls from './PipelineControls'
import SessionControls from './SessionControls'

class BottomInsightsControls extends React.Component {

  constructor(props) {
    super(props)
    this.buildMovieMetadata=this.buildMovieMetadata.bind(this)
    this.buildTier1RunOptions=this.buildTier1RunOptions.bind(this)
    this.buildMovieSetOptions=this.buildMovieSetOptions.bind(this)
  }

  buildMovieMetadata(movie_url='') {
    if (!movie_url) {
      movie_url = this.props.movie_url
    }
    let build_movies = {}
    build_movies[movie_url] = this.props.movies[movie_url]
    return {
      movies: build_movies,
      tier_1_matches: this.props.tier_1_matches,
      templates: this.props.tier_1_scanners['template'],
      selected_area_metas: this.props.tier_1_scanners['selected_area'],
    }
  }

  buildMovieSetOptions(insights_job_name) {
    const movie_set_keys = Object.keys(this.props.movie_sets)
    if (!movie_set_keys) {
      return ''
    }
    return (
      <div>
        {movie_set_keys.map((value, index) => {
          return (
            <button
                className='dropdown-item'
                key={index}
                onClick={() => this.packageAndCallSubmitJob(insights_job_name, value)}
            >
              MovieSet '{this.props.movie_sets[value]['name']}' as Job
            </button>
          )
        })}
      </div>
    )
  }

  buildTier1RunOptions(scanner_type, insights_job_name) {
    const tier_1_match_keys = Object.keys(this.props.tier_1_matches[scanner_type])
    if (tier_1_match_keys.length === 0) {
      return ''
    }

    const scanner_inventory = this.props.tier_1_scanners[scanner_type]
    return (
      <div>
        {tier_1_match_keys.map((value, index) => {
          let detail_line = 'Frames matched by ' + scanner_type + ' id ' + value
          if (Object.keys(scanner_inventory).includes(value)) {
            let record =  scanner_inventory[value]
            if (Object.keys(record).includes('name')) {
              detail_line = 'Frames matched by ' + scanner_type + ' ' + record['name']
            }
          }
          return (
            <button
                className='dropdown-item'
                key={index}
                onClick={() => this.props.submitInsightsJob(insights_job_name, value)}
            >
              {detail_line}
            </button>
          )
        })}
      </div>
    )
  }

  render() {
    let bottom_y = 110
    const ele = document.getElementById('insights_image_div')
    if (ele) {
      bottom_y += ele.offsetHeight
    }
    const controls_style = {
      top: bottom_y,
    }

    return (
      <div 
          id='bottom_insights_controls' 
          style={controls_style}
      >

        <TemplateControls 
          setGlobalStateVar={this.props.setGlobalStateVar}
          handleSetMode={this.props.handleSetMode}
          tier_1_matches={this.props.tier_1_matches}
          submitInsightsJob={this.props.submitInsightsJob}
          displayInsightsMessage={this.props.displayInsightsMessage}
          cropImage={this.props.cropImage}
          buildMovieSetOptions={this.buildMovieSetOptions}
          buildTier1RunOptions={this.buildTier1RunOptions}
          visibilityFlags={this.props.visibilityFlags}
          toggleShowVisibility={this.props.toggleShowVisibility}
          addInsightsCallback={this.props.addInsightsCallback}
          insights_image={this.props.insights_image}
          movie_url={this.props.movie_url}
          clicked_coords={this.props.clicked_coords}
          setScrubberToIndex={this.props.setScrubberToIndex}
          getFramesetHashForImageUrl={this.props.getFramesetHashForImageUrl}
          getFramesetHashesInOrder={this.props.getFramesetHashesInOrder}
          movies={this.props.movies}
          setCurrentVideo={this.props.setCurrentVideo}
          saveScannerToDatabase={this.props.saveScannerToDatabase}
          scanners={this.props.scanners}
          getScanners={this.props.getScanners}
          deleteScanner={this.props.deleteScanner}
          importScanner={this.props.importScanner}
          tier_1_scanners={this.props.tier_1_scanners}
          tier_1_scanner_current_ids={this.props.tier_1_scanner_current_ids}
        />

        <SelectedAreaControls
          setGlobalStateVar={this.props.setGlobalStateVar}
          buildMovieSetOptions={this.buildMovieSetOptions}
          buildTier1RunOptions={this.buildTier1RunOptions}
          handleSetMode={this.props.handleSetMode}
          tier_1_matches={this.props.tier_1_matches}
          insights_image={this.props.insights_image}
          getFramesetHashForImageUrl={this.props.getFramesetHashForImageUrl}
          movie_url={this.props.movie_url}
          setSelectedAreaTemplateAnchor={this.props.setSelectedAreaTemplateAnchor}
          getCurrentSelectedAreaMeta={this.props.getCurrentSelectedAreaMeta}
          visibilityFlags={this.props.visibilityFlags}
          toggleShowVisibility={this.props.toggleShowVisibility}
          displayInsightsMessage={this.props.displayInsightsMessage}
          addInsightsCallback={this.props.addInsightsCallback}
          setSelectedAreaMetas={this.props.setSelectedAreaMetas}
          scanners={this.props.scanners}
          getScanners={this.props.getScanners}
          deleteScanner={this.props.deleteScanner}
          importScanner={this.props.importScanner}
          saveScannerToDatabase={this.props.saveScannerToDatabase}
          submitInsightsJob={this.props.submitInsightsJob}
          movies={this.props.movies}
          setCurrentVideo={this.props.setCurrentVideo}
          setScrubberToIndex={this.props.setScrubberToIndex}
          getFramesetHashesInOrder={this.props.getFramesetHashesInOrder}
          tier_1_scanners={this.props.tier_1_scanners}
          tier_1_scanner_current_ids={this.props.tier_1_scanner_current_ids}
        />

        <OcrControls
          displayInsightsMessage={this.props.displayInsightsMessage}
          addInsightsCallback={this.props.addInsightsCallback}
          visibilityFlags={this.props.visibilityFlags}
          toggleShowVisibility={this.props.toggleShowVisibility}
          submitInsightsJob={this.props.submitInsightsJob}
          handleSetMode={this.props.handleSetMode}
          clicked_coords={this.props.clicked_coords}
          buildTier1RunOptions={this.buildTier1RunOptions}
          buildMovieSetOptions={this.buildMovieSetOptions}
          setGlobalStateVar={this.props.setGlobalStateVar}
          scanners={this.props.scanners}
          getScanners={this.props.getScanners}
          importScanner={this.props.importScanner}
          deleteScanner={this.props.deleteScanner}
          saveScannerToDatabase={this.props.saveScannerToDatabase}
          insights_image={this.props.insights_image}
          movie_url={this.props.movie_url}
          tier_1_matches={this.props.tier_1_matches}
          movies={this.props.movies}
          setCurrentVideo={this.props.setCurrentVideo}
          setScrubberToIndex={this.props.setScrubberToIndex}
          getFramesetHashesInOrder={this.props.getFramesetHashesInOrder}
          getFramesetHashForImageUrl={this.props.getFramesetHashForImageUrl}
          tier_1_scanners={this.props.tier_1_scanners}
          tier_1_scanner_current_ids={this.props.tier_1_scanner_current_ids}
        />

        <TelemetryControls
          displayInsightsMessage={this.props.displayInsightsMessage}
          movie_sets={this.props.movie_sets}
          submitInsightsJob={this.props.submitInsightsJob}
          telemetry_data={this.props.telemetry_data}
          setTelemetryData={this.props.setTelemetryData}
          setGlobalStateVar={this.props.setGlobalStateVar}
          visibilityFlags={this.props.visibilityFlags}
          toggleShowVisibility={this.props.toggleShowVisibility}
          tier_1_scanners={this.props.tier_1_scanners}
          tier_1_scanner_current_ids={this.props.tier_1_scanner_current_ids}
        />

        <OcrSceneAnalysisControls
          displayInsightsMessage={this.props.displayInsightsMessage}
          submitInsightsJob={this.props.submitInsightsJob}
          app_codebooks={this.props.app_codebooks}
          setGlobalStateVar={this.props.setGlobalStateVar}
          visibilityFlags={this.props.visibilityFlags}
          toggleShowVisibility={this.props.toggleShowVisibility}
          tier_1_scanners={this.props.tier_1_scanners}
          tier_1_scanner_current_ids={this.props.tier_1_scanner_current_ids}
          scanners={this.props.scanners}
          getScanners={this.props.getScanners}
          deleteScanner={this.props.deleteScanner}
          importScanner={this.props.importScanner}
          saveScannerToDatabase={this.props.saveScannerToDatabase}
        />

        <EntityFinderControls
          displayInsightsMessage={this.props.displayInsightsMessage}
          submitInsightsJob={this.props.submitInsightsJob}
          setGlobalStateVar={this.props.setGlobalStateVar}
          visibilityFlags={this.props.visibilityFlags}
          toggleShowVisibility={this.props.toggleShowVisibility}
          tier_1_scanners={this.props.tier_1_scanners}
          tier_1_scanner_current_ids={this.props.tier_1_scanner_current_ids}
          scanners={this.props.scanners}
          getScanners={this.props.getScanners}
          deleteScanner={this.props.deleteScanner}
          importScanner={this.props.importScanner}
          saveScannerToDatabase={this.props.saveScannerToDatabase}
        />

        <PipelineControls
          visibilityFlags={this.props.visibilityFlags}
          toggleShowVisibility={this.props.toggleShowVisibility}
          pipelines={this.props.pipelines}
          current_pipeline_id={this.props.current_pipeline_id}
          getPipelines={this.props.getPipelines}
          dispatchPipeline={this.props.dispatchPipeline}
          deletePipeline={this.props.deletePipeline}
          displayInsightsMessage={this.props.displayInsightsMessage}
          savePipelineToDatabase={this.props.savePipelineToDatabase}
          setGlobalStateVar={this.props.setGlobalStateVar}
          movies={this.props.movies}
          tier_1_scanners={this.props.tier_1_scanners}
        />

        <AnnotationControls
          displayInsightsMessage={this.props.displayInsightsMessage}
          saveAnnotation={this.props.saveAnnotation}
          deleteAnnotation={this.props.deleteAnnotation}
          annotations={this.props.annotations}
          handleSetMode={this.props.handleSetMode}
          setKeyDownCallback={this.props.setKeyDownCallback}
          getAnnotations={this.props.getAnnotations}
          visibilityFlags={this.props.visibilityFlags}
          toggleShowVisibility={this.props.toggleShowVisibility}
          tier_1_scanners={this.props.tier_1_scanners}
        />

        <DiffControls
          displayInsightsMessage={this.props.displayInsightsMessage}
          visibilityFlags={this.props.visibilityFlags}
          toggleShowVisibility={this.props.toggleShowVisibility}
          movie_sets={this.props.movie_sets}
          submitInsightsJob={this.props.submitInsightsJob}
          blinkDiff={this.props.blinkDiff}
          setImageTypeToDisplay={this.props.setImageTypeToDisplay}
          imageTypeToDisplay={this.props.imageTypeToDisplay}
        />

        <RedactControls
          displayInsightsMessage={this.props.displayInsightsMessage}
          visibilityFlags={this.props.visibilityFlags}
          toggleShowVisibility={this.props.toggleShowVisibility}
          submitInsightsJob={this.props.submitInsightsJob}
          mask_method={this.props.mask_method}
          movies={this.props.movies}
          setGlobalStateVar={this.props.setGlobalStateVar}
        />

        <ZipControls
          displayInsightsMessage={this.props.displayInsightsMessage}
          visibilityFlags={this.props.visibilityFlags}
          toggleShowVisibility={this.props.toggleShowVisibility}
          submitInsightsJob={this.props.submitInsightsJob}
          movies={this.props.movies}
        />

        <MovieSetsControls
          setGlobalStateVar={this.props.setGlobalStateVar}
          displayInsightsMessage={this.props.displayInsightsMessage}
          movie_sets={this.props.movie_sets}
          draggedId={this.props.draggedId}
          visibilityFlags={this.props.visibilityFlags}
          toggleShowVisibility={this.props.toggleShowVisibility}
        />

        <ResultsControls
          displayInsightsMessage={this.props.displayInsightsMessage}
          visibilityFlags={this.props.visibilityFlags}
          toggleShowVisibility={this.props.toggleShowVisibility}
          submitInsightsJob={this.props.submitInsightsJob}
          jobs={this.props.jobs}
          results={this.props.results}
          setScrubberToIndex={this.props.setScrubberToIndex}
          movies={this.props.movies}
          movie_url={this.props.movie_url}
          setCurrentVideo={this.props.setCurrentVideo}
          setGlobalStateVar={this.props.setGlobalStateVar}
          setModalImage={this.props.setModalImage}

        />

        <OcrMovieAnalysisControls
          displayInsightsMessage={this.props.displayInsightsMessage}
          visibilityFlags={this.props.visibilityFlags}
          toggleShowVisibility={this.props.toggleShowVisibility}
          submitInsightsJob={this.props.submitInsightsJob}
          movies={this.props.movies}
          jobs={this.props.jobs}
          handleSetMode={this.props.handleSetMode}
          addInsightsCallback={this.props.addInsightsCallback}
          movie_url={this.props.movie_url}
          insights_image={this.props.insights_image}
          getFramesetHashForImageUrl={this.props.getFramesetHashForImageUrl}
          setInsightsImage={this.props.setInsightsImage}
          setGlobalStateVar={this.props.setGlobalStateVar}
          tier_1_scanners={this.props.tier_1_scanners}
          tier_1_scanner_current_ids={this.props.tier_1_scanner_current_ids}
          scanners={this.props.scanners}
          getScanners={this.props.getScanners}
          deleteScanner={this.props.deleteScanner}
          importScanner={this.props.importScanner}
          saveScannerToDatabase={this.props.saveScannerToDatabase}
        />

        <FilesystemControls
          visibilityFlags={this.props.visibilityFlags}
          toggleShowVisibility={this.props.toggleShowVisibility}
          files={this.props.files}
          getFiles={this.props.getFiles}
          deleteFile={this.props.deleteFile}
          displayInsightsMessage={this.props.displayInsightsMessage}
          submitInsightsJob={this.props.submitInsightsJob}
          buildMovieMetadata={this.buildMovieMetadata}
        />

        <SessionControls
          setGlobalStateVar={this.props.setGlobalStateVar}
          toggleGlobalStateVar={this.props.toggleGlobalStateVar}
          current_workbook_name={this.props.current_workbook_name}
          current_workbook_id={this.props.current_workbook_id}
          saveWorkbook={this.props.saveWorkbook}
          saveWorkbookName={this.props.saveWorkbookName}
          playSound={this.props.playSound}
          displayInsightsMessage={this.props.displayInsightsMessage}
          callPing={this.props.callPing}
          workbooks={this.props.workbooks}
          deleteWorkbook={this.props.deleteWorkbook}
          loadWorkbook={this.props.loadWorkbook}
          visibilityFlags={this.props.visibilityFlags}
          toggleShowVisibility={this.props.toggleShowVisibility}
          campaign_movies={this.props.campaign_movies}
          setCampaignMovies={this.props.setCampaignMovies}
          updateGlobalState={this.props.updateGlobalState}
          whenDoneTarget={this.props.whenDoneTarget}
          frameset_discriminator={this.props.frameset_discriminator}
          preserveAllJobs={this.props.preserveAllJobs}
          userTone={this.props.userTone}
          submitInsightsJob={this.props.submitInsightsJob}
          preserve_movie_audio={this.props.preserve_movie_audio}
          getPipelines={this.props.getPipelines}
        />

      </div>
    )
  }
}

export default BottomInsightsControls;
