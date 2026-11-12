// Holds the app awake for a few seconds when a Live Activity button is pressed.
//
// A press runs expo-widgets' `LiveActivityUserInteraction` in the app process.
// Its `perform()` posts this notification and returns at once, without waiting
// for JavaScript. If the app was suspended, iOS may suspend it again before JS
// has paused the timer, rescheduled the alerts and updated the activity. A
// background task keeps the process running while that work finishes. JS cannot
// signal completion without a native module, so the hold is a fixed length.
//
// `+load` registers the observer at process start (every launch, including a
// background launch for a press), with no change to AppDelegate or SceneDelegate.
// Compiled into the app target only, never the widget extension.
#import <UIKit/UIKit.h>

// Must match `onUserInteraction` in expo-widgets ios/WidgetsModule.swift.
static NSString *const kWidgetInteractionNotification = @"onExpoWidgetsUserInteraction";
static const int64_t kHoldSeconds = 5;

@interface DorkroomWidgetInteractionHold : NSObject
@end

@implementation DorkroomWidgetInteractionHold

+ (void)load {
  [[NSNotificationCenter defaultCenter]
      addObserverForName:kWidgetInteractionNotification
                  object:nil
                   queue:nil
              usingBlock:^(NSNotification *_Nonnull note) {
                // The notification is posted from whatever thread `perform()` runs
                // on. Everything below (begin, storing the identifier, the timer and
                // the end) runs on the main queue, one serial context, so the
                // identifier is never touched from two threads and the task is ended
                // exactly once, by whichever of the timer or the expiration handler
                // comes first.
                dispatch_block_t hold = ^{
                  UIApplication *application = UIApplication.sharedApplication;
                  __block UIBackgroundTaskIdentifier task = UIBackgroundTaskInvalid;
                  dispatch_block_t finish = ^{
                    if (task == UIBackgroundTaskInvalid) return;
                    UIBackgroundTaskIdentifier ending = task;
                    task = UIBackgroundTaskInvalid;
                    [application endBackgroundTask:ending];
                  };
                  task = [application beginBackgroundTaskWithName:@"widget-interaction"
                                                expirationHandler:finish];
                  dispatch_after(dispatch_time(DISPATCH_TIME_NOW, kHoldSeconds * NSEC_PER_SEC),
                                 dispatch_get_main_queue(), finish);
                };
                if (NSThread.isMainThread) {
                  hold();
                } else {
                  dispatch_async(dispatch_get_main_queue(), hold);
                }
              }];
}

@end
