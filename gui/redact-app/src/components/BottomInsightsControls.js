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
          handleSetMode={this.props.handleSetMode}
          getCurrentTemplateMatches={this.props.getCurrentTemplateMatches}
          submitInsightsJob={this.props.submitInsightsJob}
          templates={this.props.templates}
          current_template_id={this.props.current_template_id}
          displayInsightsMessage={this.props.displayInsightsMessage}
          setCurrentTemplateId={this.props.setCurrentTemplateId}
          setTemplates={this.props.setTemplates}
          cropImage={this.props.cropImage}
          movie_sets={this.props.movie_sets}
          visibilityFlags={this.props.visibilityFlags}
          toggleShowVisibility={this.props.toggleShowVisibility}
          addInsightsCallback={this.props.addInsightsCallback}
          insights_image={this.props.insights_image}
          movie_url={this.props.movie_url}
        />

        <SelectedAreaControls
          handleSetMode={this.props.handleSetMode}
          templates={this.props.templates}
          current_template_id={this.props.current_template_id}
          clearMovieSelectedAreas={this.props.clearMovieSelectedAreas}
          setSelectedAreaTemplateAnchor={this.props.setSelectedAreaTemplateAnchor}
          getCurrentSelectedAreaMeta={this.props.getCurrentSelectedAreaMeta}
          visibilityFlags={this.props.visibilityFlags}
          toggleShowVisibility={this.props.toggleShowVisibility}
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
          setTelemetryRules={this.props.setTelemetryRules}
          setCurrentTelemetryRuleId={this.props.setCurrentTelemetryRuleId}
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
          startOcrRegionAdd={this.props.startOcrRegionAdd}
          displayInsightsMessage={this.props.displayInsightsMessage}
          visibilityFlags={this.props.visibilityFlags}
          toggleShowVisibility={this.props.toggleShowVisibility}
        />

        <MovieSetsControls
          displayInsightsMessage={this.props.displayInsightsMessage}
          movie_sets={this.props.movie_sets}
          setMovieSets={this.props.setMovieSets}
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
        />

        <SessionControls
          current_workbook_name={this.props.current_workbook_name}
          current_workbook_id={this.props.current_workbook_id}
          saveWorkbook={this.props.saveWorkbook}
          saveWorkbookName={this.props.saveWorkbookName}
          playSound={this.props.playSound}
          togglePlaySound={this.props.togglePlaySound}
          displayInsightsMessage={this.props.displayInsightsMessage}
          callPing={this.props.callPing}
          workbooks={this.props.workbooks}
          deleteWorkbook={this.props.deleteWorkbook}
          loadWorkbook={this.props.loadWorkbook}
          visibilityFlags={this.props.visibilityFlags}
          toggleShowVisibility={this.props.toggleShowVisibility}
          setFramesetDiscriminator={this.props.setFramesetDiscriminator}
          campaign_movies={this.props.campaign_movies}
          setCampaignMovies={this.props.setCampaignMovies}
          updateGlobalState={this.props.updateGlobalState}
          whenDoneTarget={this.props.whenDoneTarget}
          setWhenDoneTarget={this.props.setWhenDoneTarget}
          frameset_discriminator={this.props.frameset_discriminator}
          preserveAllJobs={this.props.preserveAllJobs}
          togglePreserveAllJobs={this.props.togglePreserveAllJobs}
        />

      </div>
    )
  }
}

export default BottomInsightsControls;
