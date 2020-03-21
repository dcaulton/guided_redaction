import React from 'react';
import TemplateControls from './TemplateControls'
import AnnotationControls from './AnnotationControls'
import TelemetryControls from './TelemetryControls'
import SelectedAreaControls from './SelectedAreaControls'
import OcrControls from './OcrControls'
import DiffControls from './DiffControls'
import MovieSetsControls from './MovieSetsControls'
import ResultsControls from './ResultsControls'
import FilesystemControls from './FilesystemControls'
import PipelineControls from './PipelineControls'
import SessionControls from './SessionControls'

class BottomInsightsControls extends React.Component {

  constructor(props) {
    super(props)
    this.buildMovieMetadata=this.buildMovieMetadata.bind(this)
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
      templates: this.props.templates,
      selected_area_metas: this.props.selected_area_metas,
    }
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
          templates={this.props.templates}
          current_template_id={this.props.current_template_id}
          displayInsightsMessage={this.props.displayInsightsMessage}
          cropImage={this.props.cropImage}
          movie_sets={this.props.movie_sets}
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
          current_ocr_rule_id={this.props.current_ocr_rule_id}
        />

        <SelectedAreaControls
          setGlobalStateVar={this.props.setGlobalStateVar}
          movie_sets={this.props.movie_sets}
          handleSetMode={this.props.handleSetMode}
          tier_1_matches={this.props.tier_1_matches}
          templates={this.props.templates}
          insights_image={this.props.insights_image}
          movie_url={this.props.movie_url}
          current_template_id={this.props.current_template_id}
          setSelectedAreaTemplateAnchor={this.props.setSelectedAreaTemplateAnchor}
          getCurrentSelectedAreaMeta={this.props.getCurrentSelectedAreaMeta}
          visibilityFlags={this.props.visibilityFlags}
          toggleShowVisibility={this.props.toggleShowVisibility}
          displayInsightsMessage={this.props.displayInsightsMessage}
          addInsightsCallback={this.props.addInsightsCallback}
          selected_area_metas={this.props.selected_area_metas}
          setSelectedAreaMetas={this.props.setSelectedAreaMetas}
          scanners={this.props.scanners}
          getScanners={this.props.getScanners}
          deleteScanner={this.props.deleteScanner}
          importScanner={this.props.importScanner}
          saveScannerToDatabase={this.props.saveScannerToDatabase}
          submitInsightsJob={this.props.submitInsightsJob}
        />

        <AnnotationControls
          templates={this.props.templates}
          current_template_id={this.props.current_template_id}
          displayInsightsMessage={this.props.displayInsightsMessage}
          saveAnnotation={this.props.saveAnnotation}
          deleteAnnotation={this.props.deleteAnnotation}
          annotations={this.props.annotations}
          handleSetMode={this.props.handleSetMode}
          setKeyDownCallback={this.props.setKeyDownCallback}
          getAnnotations={this.props.getAnnotations}
          visibilityFlags={this.props.visibilityFlags}
          toggleShowVisibility={this.props.toggleShowVisibility}
        />

        <TelemetryControls
          displayInsightsMessage={this.props.displayInsightsMessage}
          movie_sets={this.props.movie_sets}
          submitInsightsJob={this.props.submitInsightsJob}
          telemetry_rules={this.props.telemetry_rules}
          current_telemetry_rule_id={this.props.current_telemetry_rule_id}
          telemetry_data={this.props.telemetry_data}
          setTelemetryData={this.props.setTelemetryData}
          setGlobalStateVar={this.props.setGlobalStateVar}
          visibilityFlags={this.props.visibilityFlags}
          toggleShowVisibility={this.props.toggleShowVisibility}
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

        <OcrControls
          displayInsightsMessage={this.props.displayInsightsMessage}
          addInsightsCallback={this.props.addInsightsCallback}
          visibilityFlags={this.props.visibilityFlags}
          toggleShowVisibility={this.props.toggleShowVisibility}
          submitInsightsJob={this.props.submitInsightsJob}
          handleSetMode={this.props.handleSetMode}
          movie_sets={this.props.movie_sets}
          clicked_coords={this.props.clicked_coords}
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
        />

        <PipelineControls
          visibilityFlags={this.props.visibilityFlags}
          toggleShowVisibility={this.props.toggleShowVisibility}
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
        />

      </div>
    )
  }
}

export default BottomInsightsControls;