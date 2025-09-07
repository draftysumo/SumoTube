// main.cpp
#include <QApplication>
#include <QDirIterator>
#include <QGridLayout>
#include <QLabel>
#include <QToolButton>
#include <QScrollArea>
#include <QWidget>
#include <QFileInfo>
#include <QFileDialog>
#include <QPushButton>
#include <QLineEdit>
#include <QSettings>
#include <QTemporaryDir>
#include <QVector>
#include <QTimer>
#include <QProcess>
#include <QtConcurrent>
#include <QFuture>
#include <QFutureWatcher>
#include <QPixmap>
#include <QDebug>
#include <QDateTime>
#include <QVBoxLayout>
#include <QHBoxLayout>
#include <QRandomGenerator>
#include <algorithm>
#include <QFile>
#include <QTextStream>

// Logging helper
static QFile logFile("videobrowser.log");
static void logMessage(const QString &msg) {
    if(!logFile.isOpen()) logFile.open(QIODevice::Append | QIODevice::Text);
    QTextStream out(&logFile);
    QString timeStamp = QDateTime::currentDateTime().toString("yyyy-MM-dd HH:mm:ss");
    out << "[" << timeStamp << "] " << msg << "\n";
    out.flush();
    qDebug() << msg;
}

// Stable ID
static QString fileId(const QString &path) {
    QFileInfo fi(path);
    QString c = fi.canonicalFilePath();
    return c.isEmpty() ? fi.absoluteFilePath() : c;
}

// Extract middle-frame thumbnail
QString extractThumbnail(const QString &videoPath, const QString &thumbPath) {
    QProcess probe;
    probe.start("ffprobe", {"-v","error","-show_entries","format=duration","-of","default=noprint_wrappers=1:nokey=1", videoPath});
    probe.waitForFinished();
    double duration = probe.readAllStandardOutput().trimmed().toDouble();
    if(duration <= 0) duration = 1.0;
    double midpoint = duration/2.0;

    QProcess ffmpeg;
    ffmpeg.start("ffmpeg", {"-y","-ss",QString::number(midpoint),"-i",videoPath,"-vframes","1",thumbPath});
    ffmpeg.waitForFinished();
    return thumbPath;
}

QString formatDuration(double seconds) {
    int total = static_cast<int>(seconds);
    int h = total/3600;
    int m = (total%3600)/60;
    int s = total%60;
    if(h>0) return QString("%1:%2:%3").arg(h,2,10,QLatin1Char('0')).arg(m,2,10,QLatin1Char('0')).arg(s,2,10,QLatin1Char('0'));
    else return QString("%1:%2").arg(m,2,10,QLatin1Char('0')).arg(s,2,10,QLatin1Char('0'));
}

double getVideoDuration(const QString &filePath) {
    QProcess probe;
    probe.start("ffprobe", {"-v","error","-show_entries","format=duration","-of","default=noprint_wrappers=1:nokey=1", filePath});
    probe.waitForFinished();
    return probe.readAllStandardOutput().trimmed().toDouble();
}

// Video card structure
struct VideoCard : public QObject {
    Q_OBJECT
public:
    VideoCard(QObject* parent = nullptr) : QObject(parent) {}
    
    QString filePath;
    QString title;
    QString channel;
    QToolButton* button = nullptr;
    QLabel* pinLabel = nullptr;
    QLabel* thumbLabel = nullptr;
    bool pinned = false;

    QPixmap customThumb;
    QString customThumbPath;

    QFuture<void> thumbFuture;
    QFutureWatcher<void>* thumbWatcher = nullptr;

    QVector<QPixmap> hoverFrames;
    QTimer* hoverTimer = nullptr;
    int currentFrameIndex = 0;
    bool canceled = false;
};

// Hover filter for previews
class HoverFilter : public QObject {
    Q_OBJECT
public:
    HoverFilter(VideoCard* v) : video(v) {}
protected:
    bool eventFilter(QObject* obj, QEvent* event) override {
        if(event->type()==QEvent::Enter){
            if(video->hoverFrames.isEmpty()) return false;
            video->currentFrameIndex = 0;
            if(!video->hoverTimer){
                video->hoverTimer = new QTimer(video);
                QObject::connect(video->hoverTimer,&QTimer::timeout,[this](){
                    if(video->canceled || video->hoverFrames.isEmpty()) { video->hoverTimer->stop(); return; }
                    video->thumbLabel->setPixmap(video->hoverFrames[video->currentFrameIndex]);
                    video->currentFrameIndex = (video->currentFrameIndex + 1) % video->hoverFrames.size();
                });
            }
            video->hoverTimer->start(300);
        } else if(event->type()==QEvent::Leave){
            if(video->hoverTimer) video->hoverTimer->stop();
            video->thumbLabel->setPixmap(video->customThumb);
        }
        return false;
    }
private:
    VideoCard* video;
};

// Build video cards
QVector<VideoCard*> buildVideoCards(const QString &basePath, QTemporaryDir &tempDir, const QString &thumbBase){
    QVector<VideoCard*> videos;
    QPixmap placeholder(320,180);
    placeholder.fill(Qt::darkGray);

    QDirIterator it(basePath, {"*.mp4","*.mkv","*.avi","*.mov"}, QDir::Files, QDirIterator::Subdirectories);
    while(it.hasNext()){
        QString filePath = it.next();
        QFileInfo info(filePath);
        QString channel = QFileInfo(info.dir().path()).fileName();
        QString videoTitle = info.completeBaseName();

        QWidget* thumbWrapper = new QWidget;
        thumbWrapper->setFixedSize(320,180);
        QVBoxLayout* thumbLayout = new QVBoxLayout(thumbWrapper);
        thumbLayout->setContentsMargins(0,0,0,0);
        thumbLayout->setAlignment(Qt::AlignCenter);

        QLabel* thumbLabel = new QLabel;
        thumbLabel->setAlignment(Qt::AlignCenter);
        thumbLabel->setPixmap(placeholder);
        thumbLayout->addWidget(thumbLabel);

        QLabel* durationLabel = new QLabel("00:00", thumbWrapper);
        durationLabel->setObjectName("durationLabel");
        durationLabel->setStyleSheet("background-color: rgba(0,0,0,150); color: white; padding: 3px; font-size: 11px;");
        durationLabel->adjustSize();
        durationLabel->move(thumbWrapper->width()-durationLabel->width()-6, thumbWrapper->height()-durationLabel->height()-6);
        durationLabel->show();

        QLabel* titleLabel = new QLabel(videoTitle);
        titleLabel->setAlignment(Qt::AlignCenter);
        titleLabel->setStyleSheet("font-size: 14px; font-weight: bold;");
        QLabel* channelLabel = new QLabel(channel);
        channelLabel->setAlignment(Qt::AlignCenter);
        channelLabel->setStyleSheet("font-size: 12px; color: gray;");

        QWidget* card = new QWidget;
        QVBoxLayout* cardLayout = new QVBoxLayout(card);
        cardLayout->setSpacing(3);
        cardLayout->setContentsMargins(0,0,0,0);
        cardLayout->addWidget(thumbWrapper);
        cardLayout->addWidget(titleLabel);
        cardLayout->addWidget(channelLabel);

        QToolButton* btn = new QToolButton;
        btn->setAutoRaise(true);
        btn->setFixedSize(340,220);
        btn->setLayout(new QVBoxLayout);
        btn->layout()->setContentsMargins(0,0,0,0);
        btn->layout()->addWidget(card);

        QObject::connect(btn,&QToolButton::clicked,[filePath](){
            QProcess::startDetached("xdg-open", {filePath});
        });

        QLabel* pinLabel = new QLabel("Pinned", btn);
        pinLabel->setStyleSheet("font-size:12px; font-weight:bold; color:white; background-color: rgba(0,0,0,150); padding: 2px;");
        pinLabel->adjustSize();
        pinLabel->move(5,5);
        pinLabel->setVisible(false);

        VideoCard* v = new VideoCard;
        v->filePath = filePath;
        v->title = videoTitle;
        v->channel = channel;
        v->button = btn;
        v->pinLabel = pinLabel;
        v->thumbLabel = thumbLabel;
        v->canceled = false;

        // Custom thumbnail
        QString customThumbPath;
        if(!thumbBase.isEmpty()){
            QStringList exts = {"png","jpg","jpeg"};
            for(const QString &ext : exts){
                QString path = thumbBase + "/" + videoTitle + "." + ext;
                if(QFile::exists(path)){
                    customThumbPath = path;
                    break;
                }
            }
        }
        v->customThumbPath = customThumbPath;

        // Async main thumbnail
        QString thumbPath = tempDir.path() + "/" + videoTitle + ".png";
        v->thumbWatcher = new QFutureWatcher<void>(v);
        v->thumbWatcher->setFuture(QtConcurrent::run([filePath, thumbPath, v](){
            if(v->canceled) return;
            QPixmap pix;
            if(!v->customThumbPath.isEmpty()) pix.load(v->customThumbPath);
            else { extractThumbnail(filePath, thumbPath); pix.load(thumbPath); }
            if(v->canceled) return;
            QPixmap scaled = pix.scaled(320,180,Qt::KeepAspectRatio,Qt::SmoothTransformation);
            v->customThumb = scaled;
            QMetaObject::invokeMethod(v->thumbLabel,"setPixmap",Qt::QueuedConnection,Q_ARG(QPixmap,scaled));
            double secs = getVideoDuration(filePath);
            QString durStr = formatDuration(secs);
            QMetaObject::invokeMethod(v->thumbLabel->parentWidget()->findChild<QLabel*>("durationLabel"),
                                      "setText",Qt::QueuedConnection,Q_ARG(QString,durStr));
        }));

        // Async hover frames generation
        QtConcurrent::run([filePath, title=v->title, &tempDir, v](){
            double secs = getVideoDuration(filePath);
            for(int i=1;i<=5;i++){
                if(v->canceled) return;
                double t = secs * i / 6.0;
                QString hoverPath = tempDir.path() + "/" + title + "_hover_" + QString::number(i) + ".png";
                QProcess ffmpeg;
                ffmpeg.start("ffmpeg", {"-y","-ss",QString::number(t),"-i",filePath,"-vframes","1",hoverPath});
                ffmpeg.waitForFinished();
                QPixmap frame;
                frame.load(hoverPath);
                frame = frame.scaled(320,180,Qt::KeepAspectRatio,Qt::SmoothTransformation);
                QPixmap finalFrame = frame;
                QMetaObject::invokeMethod(v, [v, finalFrame](){ v->hoverFrames.append(finalFrame); }, Qt::QueuedConnection);
            }
        });

        btn->installEventFilter(new HoverFilter(v));
        videos.append(v);
    }
    return videos;
}

// Populate grid
void populateGrid(QGridLayout* grid, QVector<VideoCard*> &videos){
    QLayoutItem* child;
    while((child=grid->takeAt(0))!=nullptr){
        if(child->widget()) child->widget()->setParent(nullptr);
        delete child;
    }

    std::stable_sort(videos.begin(),videos.end(),
                     [](VideoCard* a, VideoCard* b){ return a->pinned && !b->pinned; });

    int row=0, col=0, maxCols=5;
    int hSpacing=10, vSpacing=2;
    grid->setHorizontalSpacing(hSpacing);
    grid->setVerticalSpacing(vSpacing);
    grid->setContentsMargins(10,10,10,10);

    for(auto &v:videos){
        grid->addWidget(v->button,row,col,Qt::AlignTop | Qt::AlignLeft);
        if(v->pinLabel) v->pinLabel->setVisible(v->pinned);
        col++; if(col>=maxCols){ col=0; row++; }
    }

    if(grid->parentWidget()){
        int totalWidth = maxCols*340 + (maxCols-1)*hSpacing
                       + grid->contentsMargins().left() + grid->contentsMargins().right();
        grid->parentWidget()->setFixedWidth(totalWidth);
    }
}

// ------------------- main -------------------
int main(int argc,char *argv[]){
    QApplication app(argc,argv);
    logMessage("App started");

    QSettings settings("MyCompany","VideoBrowser");
    QWidget window;
    window.setWindowTitle("Video Browser");
    QVBoxLayout* mainLayout = new QVBoxLayout(&window);

    QHBoxLayout* topBar = new QHBoxLayout;
    QLineEdit* searchBar = new QLineEdit;
    searchBar->setPlaceholderText("Search videos or channels...");
    QPushButton* changeVideoDirBtn = new QPushButton("Video Folder");
    QPushButton* changeThumbDirBtn = new QPushButton("Thumbnail Folder");
    QPushButton* reloadBtn = new QPushButton("Reload");
    topBar->addWidget(searchBar);
    topBar->addWidget(changeVideoDirBtn);
    topBar->addWidget(changeThumbDirBtn);
    topBar->addWidget(reloadBtn);
    mainLayout->addLayout(topBar);

    QScrollArea* scroll = new QScrollArea;
    QWidget* container = new QWidget;
    QGridLayout* grid = new QGridLayout(container);

    QTemporaryDir tempDir;
    QVector<VideoCard*> videos;

    QString videoDir=settings.value("videoDir").toString();
    QString thumbDir=settings.value("thumbDir").toString();

    if(videoDir.isEmpty() || !QDir(videoDir).exists())
        videoDir=QFileDialog::getExistingDirectory(nullptr,"Select Video Directory");
    if(thumbDir.isEmpty() || !QDir(thumbDir).exists())
        thumbDir="";

    if(videoDir.isEmpty()) return 0;
    settings.setValue("videoDir",videoDir);
    settings.setValue("thumbDir",thumbDir);

    auto reloadVideos=[&](const QString &videoBase,const QString &thumbBase){
        logMessage("Reloading videos from: " + videoBase);
        for(auto v: videos){
            v->canceled = true;
            if(v->hoverTimer) { v->hoverTimer->stop(); delete v->hoverTimer; }
            if(v->thumbWatcher && v->thumbWatcher->isRunning()) v->thumbWatcher->waitForFinished();
            delete v->thumbWatcher;
            delete v;
        }
        videos.clear();

        videos = buildVideoCards(videoBase,tempDir,thumbBase);

        QStringList savedPins=settings.value("pinnedFiles").toStringList();
        for(auto &v:videos) v->pinned = savedPins.contains(fileId(v->filePath));

        for(auto &v:videos){
            v->button->setContextMenuPolicy(Qt::CustomContextMenu);
            const QString id=fileId(v->filePath);
            QObject::connect(v->button,&QToolButton::customContextMenuRequested,[&,id](const QPoint &){
                for(auto &x:videos){ if(fileId(x->filePath)==id){ x->pinned=!x->pinned; break; } }
                QStringList pins=settings.value("pinnedFiles").toStringList();
                if(pins.contains(id)) pins.removeAll(id); else pins.append(id);
                settings.setValue("pinnedFiles",pins);
                populateGrid(grid,videos);
            });
        }

        std::shuffle(videos.begin(),videos.end(),*QRandomGenerator::global());
        populateGrid(grid,videos);
    };

    reloadVideos(videoDir,thumbDir);

    QObject::connect(changeVideoDirBtn,&QPushButton::clicked,[&](){
        QString newPath=QFileDialog::getExistingDirectory(nullptr,"Select Video Directory");
        if(!newPath.isEmpty()){ videoDir=newPath; settings.setValue("videoDir",videoDir); reloadVideos(videoDir,thumbDir); }
    });

    QObject::connect(changeThumbDirBtn,&QPushButton::clicked,[&](){
        QString newPath=QFileDialog::getExistingDirectory(nullptr,"Select Custom Thumbnail Folder");
        if(!newPath.isEmpty()){ thumbDir=newPath; settings.setValue("thumbDir",thumbDir); reloadVideos(videoDir,thumbDir); }
    });

    QObject::connect(reloadBtn,&QPushButton::clicked,[&](){
        reloadVideos(videoDir,thumbDir);
    });

    QObject::connect(searchBar,&QLineEdit::textChanged,[&](const QString &text){
        for(auto &v:videos){
            bool match = v->title.contains(text,Qt::CaseInsensitive) || v->channel.contains(text,Qt::CaseInsensitive);
            v->button->setVisible(match);
        }
    });

    scroll->setWidget(container);
    scroll->setWidgetResizable(true);
    mainLayout->addWidget(scroll);

    window.resize(1000,700);
    window.show();

    int result = app.exec();
    logMessage("App exited with code: " + QString::number(result));
    return result;
}

#include "main.moc"
